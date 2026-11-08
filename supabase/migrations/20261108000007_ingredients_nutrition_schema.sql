-- =========================================================================
-- Phase 3: Ingredient database + nutrition engine
--
-- Nutrition values are never fabricated: every ingredient's nutrient
-- columns are nullable, and a missing value stays null (shown as "unknown"
-- in the UI) rather than defaulting to zero or being estimated. Values are
-- always attributed to a nutrition_sources row so their provenance is
-- visible. There is no bulk-seeded nutrition data in this migration —
-- users enter real values (from a label, a composition database lookup,
-- a supplier spec sheet) or a future phase wires up a licensed API;
-- nothing here invents numbers.
--
-- Ingredient-specific unit conversions are required, not assumed: 1 mL of
-- oil and 1 mL of honey are not the same mass, so volumetric/piece units
-- (mL, L, tsp, tbsp, cup, piece, slice, clove) only convert to grams when
-- an explicit ingredient_measurement_conversions row exists. Only g/kg are
-- trivially convertible (handled in application code, not the schema).
-- =========================================================================

-- -------------------------------------------------------------------------
-- nutrition_sources — controlled vocabulary of where a value came from.
-- Seeded with source *types*, never nutrition data itself.
-- -------------------------------------------------------------------------

create table public.nutrition_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  url text,
  created_at timestamptz not null default now()
);

alter table public.nutrition_sources enable row level security;

create policy nutrition_sources_select on public.nutrition_sources
  for select using (true);

insert into public.nutrition_sources (name, url) values
  ('Manual entry', null),
  ('Product label', null),
  ('FSANZ Australian Food Composition Database', 'https://www.foodstandards.gov.au/science-data/monitoringnutrients/afcd'),
  ('USDA FoodData Central', 'https://fdc.nal.usda.gov/'),
  ('Supplier specification sheet', null)
on conflict (name) do nothing;

-- -------------------------------------------------------------------------
-- ingredients — shared (household) or private, same visibility model as
-- recipes.
-- -------------------------------------------------------------------------

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  visibility recipe_visibility not null,
  created_by uuid not null references public.profiles (id),

  name text not null check (char_length(btrim(name)) between 1 and 200),
  alternative_names text[] not null default '{}',
  food_category text,
  state text check (state in ('raw', 'cooked')),
  brand text,
  allergens text[] not null default '{}',
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ingredients_visibility_household_consistency check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and household_id is not null)
  )
);

create index ingredients_household_idx on public.ingredients (household_id);
create index ingredients_personal_idx on public.ingredients (created_by) where visibility = 'personal';
create index ingredients_name_search_idx on public.ingredients using gin (to_tsvector('english', name));

-- -------------------------------------------------------------------------
-- ingredient_nutrition — one current record per ingredient, per 100 g of
-- the ingredient in the state declared on ingredients.state.
-- -------------------------------------------------------------------------

create table public.ingredient_nutrition (
  ingredient_id uuid primary key references public.ingredients (id) on delete cascade,
  source_id uuid references public.nutrition_sources (id),
  source_detail text,

  energy_kj numeric(8, 1) check (energy_kj >= 0),
  calories_kcal numeric(8, 1) check (calories_kcal >= 0),
  protein_g numeric(8, 2) check (protein_g >= 0),
  carbohydrate_g numeric(8, 2) check (carbohydrate_g >= 0),
  fat_g numeric(8, 2) check (fat_g >= 0),
  saturated_fat_g numeric(8, 2) check (saturated_fat_g >= 0),
  fibre_g numeric(8, 2) check (fibre_g >= 0),
  sugars_g numeric(8, 2) check (sugars_g >= 0),
  sodium_mg numeric(8, 1) check (sodium_mg >= 0),
  iron_mg numeric(8, 2) check (iron_mg >= 0),
  calcium_mg numeric(8, 1) check (calcium_mg >= 0),
  potassium_mg numeric(8, 1) check (potassium_mg >= 0),
  magnesium_mg numeric(8, 1) check (magnesium_mg >= 0),
  vitamin_b12_ug numeric(8, 2) check (vitamin_b12_ug >= 0),
  folate_ug numeric(8, 1) check (folate_ug >= 0),

  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- ingredient_measurement_conversions — required for any non-mass unit.
-- grams_per_unit = grams in exactly 1 of the given unit for this ingredient.
-- -------------------------------------------------------------------------

create table public.ingredient_measurement_conversions (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  unit measurement_unit not null,
  grams_per_unit numeric(10, 3) not null check (grams_per_unit > 0),
  created_at timestamptz not null default now(),
  unique (ingredient_id, unit),
  constraint ingredient_conversions_no_mass_units check (unit not in ('g', 'kg'))
);

-- -------------------------------------------------------------------------
-- Link recipe ingredient lines to the ingredient database (Phase 2 kept
-- this nullable/free-text; this adds the optional structured link).
-- -------------------------------------------------------------------------

alter table public.recipe_ingredients
  add column ingredient_id uuid references public.ingredients (id) on delete set null;

create index recipe_ingredients_ingredient_idx on public.recipe_ingredients (ingredient_id);

-- -------------------------------------------------------------------------
-- Permission helpers (mirrors can_view_recipe / can_edit_recipe)
-- -------------------------------------------------------------------------

create or replace function public.can_view_ingredient(p_ingredient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ingredients i
    where i.id = p_ingredient_id
      and (
        (i.visibility = 'personal' and i.created_by = auth.uid())
        or (i.visibility = 'household' and public.is_household_member(i.household_id))
      )
  );
$$;

create or replace function public.can_edit_ingredient(p_ingredient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ingredients i
    where i.id = p_ingredient_id
      and (
        (i.visibility = 'personal' and i.created_by = auth.uid())
        or (i.visibility = 'household' and public.has_household_role(i.household_id, 'editor'))
      )
  );
$$;

-- -------------------------------------------------------------------------
-- Attribution + immutability triggers (same pattern as recipes)
-- -------------------------------------------------------------------------

create or replace function public.set_ingredient_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by = auth.uid();

  if new.visibility = 'household' then
    if new.household_id is null then
      raise exception 'Household ingredients must have a household_id';
    end if;
    if not public.has_household_role(new.household_id, 'editor') then
      raise exception 'You do not have permission to add ingredients to this household';
    end if;
  elsif new.household_id is not null then
    raise exception 'Personal ingredients cannot have a household_id';
  end if;

  return new;
end;
$$;

create trigger ingredients_set_creator
  before insert on public.ingredients
  for each row execute function public.set_ingredient_creator();

create or replace function public.protect_ingredient_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'Cannot change an ingredient''s household';
  end if;
  if new.visibility is distinct from old.visibility then
    raise exception 'Cannot change an ingredient''s visibility';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Cannot change an ingredient''s creator';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger ingredients_protect_immutable
  before update on public.ingredients
  for each row execute function public.protect_ingredient_immutable_fields();

create or replace function public.set_ingredient_nutrition_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

create trigger ingredient_nutrition_set_updated_by
  before insert or update on public.ingredient_nutrition
  for each row execute function public.set_ingredient_nutrition_updated_by();

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

alter table public.ingredients enable row level security;
alter table public.ingredient_nutrition enable row level security;
alter table public.ingredient_measurement_conversions enable row level security;

create policy ingredients_select on public.ingredients
  for select using (
    (visibility = 'personal' and created_by = auth.uid())
    or (visibility = 'household' and public.is_household_member(household_id))
  );

create policy ingredients_insert on public.ingredients
  for insert with check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and public.has_household_role(household_id, 'editor'))
  );

create policy ingredients_update on public.ingredients
  for update using (public.can_edit_ingredient(id)) with check (public.can_edit_ingredient(id));

create policy ingredients_delete on public.ingredients
  for delete using (public.can_edit_ingredient(id));

create policy ingredient_nutrition_select on public.ingredient_nutrition
  for select using (public.can_view_ingredient(ingredient_id));
create policy ingredient_nutrition_write on public.ingredient_nutrition
  for all
  using (public.can_edit_ingredient(ingredient_id))
  with check (public.can_edit_ingredient(ingredient_id));

create policy ingredient_conversions_select on public.ingredient_measurement_conversions
  for select using (public.can_view_ingredient(ingredient_id));
create policy ingredient_conversions_write on public.ingredient_measurement_conversions
  for all
  using (public.can_edit_ingredient(ingredient_id))
  with check (public.can_edit_ingredient(ingredient_id));

-- -------------------------------------------------------------------------
-- Transactional create/update — ingredient + nutrition + conversions saved
-- together, same pattern as create_recipe/update_recipe.
-- -------------------------------------------------------------------------

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
    household_id, visibility, name, alternative_names, food_category, state, brand, allergens, notes
  ) values (
    v_household_id, v_visibility,
    p_ingredient->>'name',
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
