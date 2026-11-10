-- =========================================================================
-- Generalises nutrition_basis ('per_100g' | 'per_100ml') into an explicit
-- reference amount + unit (e.g. "per 100g", "per 250ml") — some products
-- are labelled per 250ml rather than per 100ml (a glass of milk, a carton
-- serving), and baking the amount into the basis name couldn't express
-- that. Only this migration's own ingredients (added minutes ago, no real
-- user data) are affected, so this corrects the design in place rather
-- than layering a second concept on top.
-- =========================================================================

alter table public.ingredients
  add column nutrition_reference_amount numeric(6, 1) not null default 100 check (nutrition_reference_amount > 0),
  add column nutrition_reference_unit text not null default 'g' check (nutrition_reference_unit in ('g', 'ml'));

update public.ingredients
set nutrition_reference_unit = 'ml', nutrition_reference_amount = 100
where nutrition_basis = 'per_100ml';

alter table public.ingredients drop column nutrition_basis;
drop type public.nutrition_basis;

create or replace function public.create_ingredient(p_ingredient jsonb, p_nutrition jsonb, p_conversions jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid := nullif(p_ingredient->>'household_id', '')::uuid;
  v_visibility recipe_visibility := (p_ingredient->>'visibility')::recipe_visibility;
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
  else
    v_household_id := null;
  end if;

  insert into public.ingredients (
    household_id, visibility, name, alternative_names, food_category, state, brand, allergens, notes,
    nutrition_reference_amount, nutrition_reference_unit
  ) values (
    v_household_id, v_visibility,
    p_ingredient->>'name',
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
begin
  if not public.can_edit_ingredient(p_ingredient_id) then
    raise exception 'You do not have permission to edit this ingredient';
  end if;

  update public.ingredients set
    name = p_ingredient->>'name',
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
