-- =========================================================================
-- Nutrition basis — some ingredients (milk, oil, stock, most liquids) are
-- naturally measured and labelled per 100ml, not per 100g; forcing every
-- ingredient onto a per-100g basis meant recording a volume-labelled
-- product required manually converting its label by density first. This
-- lets each ingredient declare which basis its stored nutrition actually
-- is, so the UI can ask for exactly what the label says and the recipe
-- calculator can scale against the right reference amount.
--
-- ingredient_measurement_conversions.grams_per_unit is unchanged in name
-- (avoiding a wide rename across every nutrition call site) but is now
-- read as "reference units per measurement unit": grams for a per_100g
-- ingredient, millilitres for a per_100ml one. g/kg stay the trivial,
-- conversion-free units for per_100g ingredients; ml/l play that role for
-- per_100ml ingredients.
-- =========================================================================

create type public.nutrition_basis as enum ('per_100g', 'per_100ml');

alter table public.ingredients
  add column nutrition_basis public.nutrition_basis not null default 'per_100g';

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
    nutrition_basis
  ) values (
    v_household_id, v_visibility,
    p_ingredient->>'name',
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'alternative_names', '[]'::jsonb)) x), '{}'),
    nullif(p_ingredient->>'food_category', ''),
    nullif(p_ingredient->>'state', ''),
    nullif(p_ingredient->>'brand', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'allergens', '[]'::jsonb)) x), '{}'),
    nullif(p_ingredient->>'notes', ''),
    coalesce(nullif(p_ingredient->>'nutrition_basis', ''), 'per_100g')::public.nutrition_basis
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
    nutrition_basis = coalesce(nullif(p_ingredient->>'nutrition_basis', ''), 'per_100g')::public.nutrition_basis
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
