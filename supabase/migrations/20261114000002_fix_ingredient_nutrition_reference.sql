-- 20261113000001_dedupe_ingredient_names.sql replaced create_ingredient and
-- update_ingredient (to add duplicate-name checks) but, being written as a
-- drop-in copy, forgot the nutrition_reference_amount/nutrition_reference_unit
-- columns added one migration earlier (20261109000004). Since then:
--   - create_ingredient always created rows with the column defaults
--     (100 / 'g'), ignoring whatever was chosen on the create form.
--   - update_ingredient never wrote these columns at all, so editing an
--     ingredient's "Nutrition is measured in" unit or "per how many" amount
--     appeared to revert on save — the UPDATE simply never touched them.
-- Restores both expressions from 20261109000004.

create or replace function public.create_ingredient(p_ingredient jsonb, p_nutrition jsonb, p_conversions jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid := nullif(p_ingredient->>'household_id', '')::uuid;
  v_visibility recipe_visibility := (p_ingredient->>'visibility')::recipe_visibility;
  v_name text := p_ingredient->>'name';
  v_ingredient_id uuid;
  v_conv jsonb;
begin
  if v_visibility = 'household' then
    if v_household_id is null then
      raise exception 'Household ingredients must have a household_id';
    end if;
    if not public.has_household_role(v_household_id, 'editor') then
      raise exception 'You do not have permission to add ingredients to this household';
    end if;
    if exists (
      select 1 from public.ingredients
      where visibility = 'household' and household_id = v_household_id and lower(btrim(name)) = lower(btrim(v_name))
    ) then
      raise exception 'An ingredient named "%" already exists in this household', v_name;
    end if;
  else
    v_household_id := null;
    if exists (
      select 1 from public.ingredients
      where visibility = 'personal' and created_by = auth.uid() and lower(btrim(name)) = lower(btrim(v_name))
    ) then
      raise exception 'An ingredient named "%" already exists in your personal list', v_name;
    end if;
  end if;

  insert into public.ingredients (
    household_id, visibility, name, alternative_names, food_category, state, brand, allergens, notes,
    nutrition_reference_amount, nutrition_reference_unit
  ) values (
    v_household_id, v_visibility,
    v_name,
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'alternative_names', '[]'::jsonb)) x), '{}'),
    nullif(p_ingredient->>'food_category', ''),
    nullif(p_ingredient->>'state', ''),
    nullif(p_ingredient->>'brand', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'allergens', '[]'::jsonb)) x), '{}'),
    nullif(p_ingredient->>'notes', ''),
    coalesce(nullif(p_ingredient->>'nutrition_reference_amount', '')::numeric, 100),
    case when p_ingredient->>'nutrition_reference_unit' = 'ml' then 'ml' else 'g' end
  )
  returning id into v_ingredient_id;

  if p_nutrition is not null and p_nutrition <> '{}'::jsonb then
    insert into public.ingredient_nutrition (
      ingredient_id, source_id, source_detail, energy_kj, calories_kcal, protein_g, carbohydrate_g,
      fat_g, saturated_fat_g, fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg,
      magnesium_mg, vitamin_b12_ug, folate_ug
    ) values (
      v_ingredient_id,
      nullif(p_nutrition->>'source_id', '')::uuid,
      nullif(p_nutrition->>'source_detail', ''),
      nullif(p_nutrition->>'energy_kj', '')::numeric,
      nullif(p_nutrition->>'calories_kcal', '')::numeric,
      nullif(p_nutrition->>'protein_g', '')::numeric,
      nullif(p_nutrition->>'carbohydrate_g', '')::numeric,
      nullif(p_nutrition->>'fat_g', '')::numeric,
      nullif(p_nutrition->>'saturated_fat_g', '')::numeric,
      nullif(p_nutrition->>'fibre_g', '')::numeric,
      nullif(p_nutrition->>'sugars_g', '')::numeric,
      nullif(p_nutrition->>'sodium_mg', '')::numeric,
      nullif(p_nutrition->>'iron_mg', '')::numeric,
      nullif(p_nutrition->>'calcium_mg', '')::numeric,
      nullif(p_nutrition->>'potassium_mg', '')::numeric,
      nullif(p_nutrition->>'magnesium_mg', '')::numeric,
      nullif(p_nutrition->>'vitamin_b12_ug', '')::numeric,
      nullif(p_nutrition->>'folate_ug', '')::numeric
    );
  end if;

  for v_conv in select * from jsonb_array_elements(coalesce(p_conversions, '[]'::jsonb))
  loop
    insert into public.ingredient_measurement_conversions (ingredient_id, unit, grams_per_unit)
    values (v_ingredient_id, (v_conv->>'unit')::measurement_unit, (v_conv->>'grams_per_unit')::numeric);
  end loop;

  return v_ingredient_id;
end;
$$;

create or replace function public.update_ingredient(
  p_ingredient_id uuid, p_ingredient jsonb, p_nutrition jsonb, p_conversions jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv jsonb;
  v_name text := p_ingredient->>'name';
  v_visibility recipe_visibility;
  v_household_id uuid;
  v_created_by uuid;
begin
  if not public.can_edit_ingredient(p_ingredient_id) then
    raise exception 'You do not have permission to edit this ingredient';
  end if;

  select visibility, household_id, created_by into v_visibility, v_household_id, v_created_by
  from public.ingredients where id = p_ingredient_id;

  if v_visibility = 'household' then
    if exists (
      select 1 from public.ingredients
      where visibility = 'household' and household_id = v_household_id and lower(btrim(name)) = lower(btrim(v_name))
        and id <> p_ingredient_id
    ) then
      raise exception 'An ingredient named "%" already exists in this household', v_name;
    end if;
  else
    if exists (
      select 1 from public.ingredients
      where visibility = 'personal' and created_by = v_created_by and lower(btrim(name)) = lower(btrim(v_name))
        and id <> p_ingredient_id
    ) then
      raise exception 'An ingredient named "%" already exists in your personal list', v_name;
    end if;
  end if;

  update public.ingredients set
    name = v_name,
    alternative_names = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'alternative_names', '[]'::jsonb)) x), '{}'),
    food_category = nullif(p_ingredient->>'food_category', ''),
    state = nullif(p_ingredient->>'state', ''),
    brand = nullif(p_ingredient->>'brand', ''),
    allergens = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'allergens', '[]'::jsonb)) x), '{}'),
    notes = nullif(p_ingredient->>'notes', ''),
    nutrition_reference_amount = coalesce(nullif(p_ingredient->>'nutrition_reference_amount', '')::numeric, 100),
    nutrition_reference_unit = case when p_ingredient->>'nutrition_reference_unit' = 'ml' then 'ml' else 'g' end
  where id = p_ingredient_id;

  delete from public.ingredient_nutrition where ingredient_id = p_ingredient_id;
  if p_nutrition is not null and p_nutrition <> '{}'::jsonb then
    insert into public.ingredient_nutrition (
      ingredient_id, source_id, source_detail, energy_kj, calories_kcal, protein_g, carbohydrate_g,
      fat_g, saturated_fat_g, fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg,
      magnesium_mg, vitamin_b12_ug, folate_ug
    ) values (
      p_ingredient_id,
      nullif(p_nutrition->>'source_id', '')::uuid,
      nullif(p_nutrition->>'source_detail', ''),
      nullif(p_nutrition->>'energy_kj', '')::numeric,
      nullif(p_nutrition->>'calories_kcal', '')::numeric,
      nullif(p_nutrition->>'protein_g', '')::numeric,
      nullif(p_nutrition->>'carbohydrate_g', '')::numeric,
      nullif(p_nutrition->>'fat_g', '')::numeric,
      nullif(p_nutrition->>'saturated_fat_g', '')::numeric,
      nullif(p_nutrition->>'fibre_g', '')::numeric,
      nullif(p_nutrition->>'sugars_g', '')::numeric,
      nullif(p_nutrition->>'sodium_mg', '')::numeric,
      nullif(p_nutrition->>'iron_mg', '')::numeric,
      nullif(p_nutrition->>'calcium_mg', '')::numeric,
      nullif(p_nutrition->>'potassium_mg', '')::numeric,
      nullif(p_nutrition->>'magnesium_mg', '')::numeric,
      nullif(p_nutrition->>'vitamin_b12_ug', '')::numeric,
      nullif(p_nutrition->>'folate_ug', '')::numeric
    );
  end if;

  delete from public.ingredient_measurement_conversions where ingredient_id = p_ingredient_id;
  for v_conv in select * from jsonb_array_elements(coalesce(p_conversions, '[]'::jsonb))
  loop
    insert into public.ingredient_measurement_conversions (ingredient_id, unit, grams_per_unit)
    values (p_ingredient_id, (v_conv->>'unit')::measurement_unit, (v_conv->>'grams_per_unit')::numeric);
  end loop;
end;
$$;
