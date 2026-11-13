-- Fixes two related ingredient-library bugs:
--
-- 1. "Can't find an ingredient I added" in the recipe form's autocomplete:
--    searchIngredientsAction was re-deriving visibility rules app-side
--    (only including household-visible ingredients when a householdId
--    happened to be passed in), which disagreed with the ingredients_select
--    RLS policy and silently excluded household ingredients whenever a
--    personal-visibility recipe was being edited. Fixed in the app code to
--    just rely on RLS, which already encodes the correct rule.
--
-- 2. "Broccoli shows twice": nothing ever stopped the same household (or
--    the same person's personal list) from having two ingredients with the
--    same name — most likely from a CSV import run twice. This merges any
--    existing duplicates (oldest row wins, recipes pointing at a duplicate
--    are repointed to the survivor) and adds a unique index so it can't
--    happen again, mirroring the pattern already used for tags.

do $$
declare
  grp record;
  keep_id uuid;
  dup_id uuid;
begin
  for grp in
    select household_id, lower(btrim(name)) as norm_name
    from public.ingredients
    where visibility = 'household'
    group by household_id, lower(btrim(name))
    having count(*) > 1
  loop
    select id into keep_id
    from public.ingredients
    where visibility = 'household' and household_id = grp.household_id and lower(btrim(name)) = grp.norm_name
    order by created_at asc
    limit 1;

    for dup_id in
      select id from public.ingredients
      where visibility = 'household' and household_id = grp.household_id and lower(btrim(name)) = grp.norm_name
        and id <> keep_id
    loop
      update public.recipe_ingredients set ingredient_id = keep_id where ingredient_id = dup_id;
      delete from public.ingredients where id = dup_id;
    end loop;
  end loop;

  for grp in
    select created_by, lower(btrim(name)) as norm_name
    from public.ingredients
    where visibility = 'personal'
    group by created_by, lower(btrim(name))
    having count(*) > 1
  loop
    select id into keep_id
    from public.ingredients
    where visibility = 'personal' and created_by = grp.created_by and lower(btrim(name)) = grp.norm_name
    order by created_at asc
    limit 1;

    for dup_id in
      select id from public.ingredients
      where visibility = 'personal' and created_by = grp.created_by and lower(btrim(name)) = grp.norm_name
        and id <> keep_id
    loop
      update public.recipe_ingredients set ingredient_id = keep_id where ingredient_id = dup_id;
      delete from public.ingredients where id = dup_id;
    end loop;
  end loop;
end;
$$;

create unique index ingredients_household_name_idx on public.ingredients (household_id, lower(btrim(name))) where visibility = 'household';
create unique index ingredients_personal_name_idx on public.ingredients (created_by, lower(btrim(name))) where visibility = 'personal';

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
    household_id, visibility, name, alternative_names, food_category, state, brand, allergens, notes
  ) values (
    v_household_id, v_visibility,
    v_name,
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'alternative_names', '[]'::jsonb)) x), '{}'),
    nullif(p_ingredient->>'food_category', ''),
    nullif(p_ingredient->>'state', ''),
    nullif(p_ingredient->>'brand', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_ingredient->'allergens', '[]'::jsonb)) x), '{}'),
    nullif(p_ingredient->>'notes', '')
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
    notes = nullif(p_ingredient->>'notes', '')
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
