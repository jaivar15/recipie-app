-- =========================================================================
-- Phase 2: Recipe management
-- A recipe is either personal (household_id null, visible only to its
-- creator) or household-scoped (household_id set, visible to members).
-- Ownership/visibility never changes except via explicit duplicate.
-- =========================================================================

create type recipe_visibility as enum ('personal', 'household');
create type recipe_difficulty as enum ('easy', 'medium', 'hard');
create type measurement_unit as enum (
  'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece', 'slice', 'clove'
);

-- -------------------------------------------------------------------------
-- recipes
-- -------------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  visibility recipe_visibility not null,
  created_by uuid not null references public.profiles (id),
  last_edited_by uuid references public.profiles (id),
  original_author_id uuid references public.profiles (id),

  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  source text,
  source_url text,
  author_name text,

  prep_time_minutes int check (prep_time_minutes >= 0),
  cook_time_minutes int check (cook_time_minutes >= 0),
  resting_time_minutes int check (resting_time_minutes >= 0),
  servings numeric(6, 2) not null default 4 check (servings > 0),
  serving_size text,
  finished_weight_grams numeric(8, 2) check (finished_weight_grams > 0),

  difficulty recipe_difficulty,
  cuisine text,
  meal_type text[] not null default '{}',
  cooking_method text,
  equipment text[] not null default '{}',

  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recipes_visibility_household_consistency check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and household_id is not null)
  )
);

create index recipes_household_idx on public.recipes (household_id) where deleted_at is null;
create index recipes_personal_idx on public.recipes (created_by) where visibility = 'personal' and deleted_at is null;
create index recipes_title_search_idx on public.recipes using gin (to_tsvector('english', title));

-- -------------------------------------------------------------------------
-- recipe_ingredients
-- -------------------------------------------------------------------------

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null default 0,
  ingredient_name text not null check (char_length(btrim(ingredient_name)) > 0),
  quantity numeric(10, 3) check (quantity >= 0),
  unit measurement_unit,
  preparation_note text,
  brand text,
  nutrition_override jsonb,
  created_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);

-- -------------------------------------------------------------------------
-- recipe_steps
-- -------------------------------------------------------------------------

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null default 0,
  instruction text not null check (char_length(btrim(instruction)) > 0),
  image_storage_path text,
  duration_minutes int check (duration_minutes >= 0),
  temperature_celsius int,
  equipment text,
  tip text,
  created_at timestamptz not null default now()
);

create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id, position);

-- -------------------------------------------------------------------------
-- recipe_images
-- -------------------------------------------------------------------------

create table public.recipe_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  storage_path text not null,
  is_primary boolean not null default false,
  caption text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index recipe_images_recipe_idx on public.recipe_images (recipe_id, position);
create unique index recipe_images_one_primary_idx on public.recipe_images (recipe_id) where is_primary;

-- -------------------------------------------------------------------------
-- recipe_favourites — per-user, never shared
-- -------------------------------------------------------------------------

create table public.recipe_favourites (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

-- -------------------------------------------------------------------------
-- recipe_personal_notes — per-user, never shared
-- -------------------------------------------------------------------------

create table public.recipe_personal_notes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create trigger recipe_personal_notes_set_updated_at
  before update on public.recipe_personal_notes
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- Permission helpers (mirrors the household helpers from Phase 1)
-- -------------------------------------------------------------------------

create or replace function public.can_view_recipe(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id
      and r.deleted_at is null
      and (
        (r.visibility = 'personal' and r.created_by = auth.uid())
        or (r.visibility = 'household' and public.is_household_member(r.household_id))
      )
  );
$$;

create or replace function public.can_edit_recipe(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id
      and (
        (r.visibility = 'personal' and r.created_by = auth.uid())
        or (r.visibility = 'household' and public.has_household_role(r.household_id, 'editor'))
      )
  );
$$;

-- -------------------------------------------------------------------------
-- Immutability + attribution triggers
-- -------------------------------------------------------------------------

create or replace function public.set_recipe_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by = auth.uid();
  new.last_edited_by = auth.uid();

  if new.visibility = 'household' then
    if new.household_id is null then
      raise exception 'Household recipes must have a household_id';
    end if;
    if not public.has_household_role(new.household_id, 'editor') then
      raise exception 'You do not have permission to add recipes to this household';
    end if;
  elsif new.household_id is not null then
    raise exception 'Personal recipes cannot have a household_id';
  end if;

  return new;
end;
$$;

create trigger recipes_set_creator
  before insert on public.recipes
  for each row execute function public.set_recipe_creator();

create or replace function public.protect_recipe_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'Cannot change a recipe''s household; duplicate it instead';
  end if;
  if new.visibility is distinct from old.visibility then
    raise exception 'Cannot change a recipe''s visibility directly; duplicate it instead';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'Cannot change a recipe''s creator';
  end if;
  if new.deleted_at is distinct from old.deleted_at
     and coalesce(current_setting('app.allow_recipe_delete_toggle', true), 'off') <> 'on' then
    raise exception 'Use soft_delete_recipe() or restore_recipe() to change deletion state';
  end if;

  new.last_edited_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_protect_immutable
  before update on public.recipes
  for each row execute function public.protect_recipe_immutable_fields();

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_images enable row level security;
alter table public.recipe_favourites enable row level security;
alter table public.recipe_personal_notes enable row level security;

create policy recipes_select on public.recipes
  for select using (
    deleted_at is null
    and (
      (visibility = 'personal' and created_by = auth.uid())
      or (visibility = 'household' and public.is_household_member(household_id))
    )
  );

-- Owners can still see (and restore) their own soft-deleted household recipes.
create policy recipes_select_deleted_by_owner on public.recipes
  for select using (
    deleted_at is not null
    and (
      (visibility = 'personal' and created_by = auth.uid())
      or (visibility = 'household' and public.has_household_role(household_id, 'owner'))
    )
  );

create policy recipes_insert on public.recipes
  for insert with check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and public.has_household_role(household_id, 'editor'))
  );

create policy recipes_update on public.recipes
  for update using (public.can_edit_recipe(id))
  with check (public.can_edit_recipe(id));

create policy recipe_ingredients_select on public.recipe_ingredients
  for select using (public.can_view_recipe(recipe_id));
create policy recipe_ingredients_write on public.recipe_ingredients
  for all using (public.can_edit_recipe(recipe_id)) with check (public.can_edit_recipe(recipe_id));

create policy recipe_steps_select on public.recipe_steps
  for select using (public.can_view_recipe(recipe_id));
create policy recipe_steps_write on public.recipe_steps
  for all using (public.can_edit_recipe(recipe_id)) with check (public.can_edit_recipe(recipe_id));

create policy recipe_images_select on public.recipe_images
  for select using (public.can_view_recipe(recipe_id));
create policy recipe_images_write on public.recipe_images
  for all using (public.can_edit_recipe(recipe_id)) with check (public.can_edit_recipe(recipe_id));

-- Favourites and notes are always private to the user who made them, and
-- only ever attached to a recipe that user can currently view.
create policy recipe_favourites_all on public.recipe_favourites
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_view_recipe(recipe_id));

create policy recipe_personal_notes_all on public.recipe_personal_notes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_view_recipe(recipe_id));

-- -------------------------------------------------------------------------
-- Soft delete / restore (owner-only for household recipes)
-- -------------------------------------------------------------------------

create or replace function public.soft_delete_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_visibility recipe_visibility;
  v_created_by uuid;
  v_title text;
begin
  select household_id, visibility, created_by, title
    into v_household_id, v_visibility, v_created_by, v_title
  from public.recipes where id = p_recipe_id;

  if not found then
    raise exception 'Recipe not found';
  end if;

  if v_visibility = 'household' and not public.has_household_role(v_household_id, 'owner') then
    raise exception 'Only the household owner can delete this recipe';
  end if;
  if v_visibility = 'personal' and v_created_by <> auth.uid() then
    raise exception 'You can only delete your own personal recipes';
  end if;

  perform set_config('app.allow_recipe_delete_toggle', 'on', true);
  update public.recipes set deleted_at = now() where id = p_recipe_id;
  perform set_config('app.allow_recipe_delete_toggle', 'off', true);

  if v_visibility = 'household' then
    perform public.log_activity(v_household_id, 'recipe_deleted', 'recipe', p_recipe_id,
      jsonb_build_object('title', v_title));
  end if;
end;
$$;

create or replace function public.restore_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_visibility recipe_visibility;
  v_created_by uuid;
  v_title text;
begin
  select household_id, visibility, created_by, title
    into v_household_id, v_visibility, v_created_by, v_title
  from public.recipes where id = p_recipe_id;

  if not found then
    raise exception 'Recipe not found';
  end if;

  if v_visibility = 'household' and not public.has_household_role(v_household_id, 'owner') then
    raise exception 'Only the household owner can restore this recipe';
  end if;
  if v_visibility = 'personal' and v_created_by <> auth.uid() then
    raise exception 'You can only restore your own personal recipes';
  end if;

  perform set_config('app.allow_recipe_delete_toggle', 'on', true);
  update public.recipes set deleted_at = null where id = p_recipe_id;
  perform set_config('app.allow_recipe_delete_toggle', 'off', true);

  if v_visibility = 'household' then
    perform public.log_activity(v_household_id, 'recipe_restored', 'recipe', p_recipe_id,
      jsonb_build_object('title', v_title));
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- Transactional create/update/duplicate — the recipe editor submits the
-- whole recipe (fields + ingredients + steps) in one call so a partial
-- network failure can never leave a half-saved recipe.
-- -------------------------------------------------------------------------

create or replace function public.create_recipe(p_recipe jsonb, p_ingredients jsonb, p_steps jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid := nullif(p_recipe->>'household_id', '')::uuid;
  v_visibility recipe_visibility := (p_recipe->>'visibility')::recipe_visibility;
  v_recipe_id uuid;
  v_ing jsonb;
  v_step jsonb;
  v_pos int;
begin
  if v_visibility = 'household' then
    if v_household_id is null then
      raise exception 'Household recipes must have a household_id';
    end if;
    if not public.has_household_role(v_household_id, 'editor') then
      raise exception 'You do not have permission to add recipes to this household';
    end if;
  else
    v_household_id := null;
  end if;

  insert into public.recipes (
    household_id, visibility, title, description, source, source_url, author_name,
    prep_time_minutes, cook_time_minutes, resting_time_minutes, servings, serving_size,
    finished_weight_grams, difficulty, cuisine, meal_type, cooking_method, equipment
  ) values (
    v_household_id, v_visibility,
    p_recipe->>'title', nullif(p_recipe->>'description', ''), nullif(p_recipe->>'source', ''),
    nullif(p_recipe->>'source_url', ''), nullif(p_recipe->>'author_name', ''),
    nullif(p_recipe->>'prep_time_minutes', '')::int, nullif(p_recipe->>'cook_time_minutes', '')::int,
    nullif(p_recipe->>'resting_time_minutes', '')::int,
    coalesce(nullif(p_recipe->>'servings', '')::numeric, 4),
    nullif(p_recipe->>'serving_size', ''), nullif(p_recipe->>'finished_weight_grams', '')::numeric,
    nullif(p_recipe->>'difficulty', '')::recipe_difficulty, nullif(p_recipe->>'cuisine', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'meal_type', '[]'::jsonb)) x), '{}'),
    nullif(p_recipe->>'cooking_method', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'equipment', '[]'::jsonb)) x), '{}')
  )
  returning id into v_recipe_id;

  v_pos := 0;
  for v_ing in select * from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (recipe_id, position, ingredient_name, quantity, unit, preparation_note, brand)
    values (
      v_recipe_id, v_pos, v_ing->>'ingredient_name',
      nullif(v_ing->>'quantity', '')::numeric, nullif(v_ing->>'unit', '')::measurement_unit,
      nullif(v_ing->>'preparation_note', ''), nullif(v_ing->>'brand', '')
    );
    v_pos := v_pos + 1;
  end loop;

  v_pos := 0;
  for v_step in select * from jsonb_array_elements(coalesce(p_steps, '[]'::jsonb))
  loop
    insert into public.recipe_steps (recipe_id, position, instruction, duration_minutes, temperature_celsius, equipment, tip)
    values (
      v_recipe_id, v_pos, v_step->>'instruction',
      nullif(v_step->>'duration_minutes', '')::int, nullif(v_step->>'temperature_celsius', '')::int,
      nullif(v_step->>'equipment', ''), nullif(v_step->>'tip', '')
    );
    v_pos := v_pos + 1;
  end loop;

  if v_visibility = 'household' then
    perform public.log_activity(v_household_id, 'recipe_created', 'recipe', v_recipe_id,
      jsonb_build_object('title', p_recipe->>'title'));
  end if;

  return v_recipe_id;
end;
$$;

create or replace function public.update_recipe(p_recipe_id uuid, p_recipe jsonb, p_ingredients jsonb, p_steps jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_visibility recipe_visibility;
  v_ing jsonb;
  v_step jsonb;
  v_pos int;
begin
  if not public.can_edit_recipe(p_recipe_id) then
    raise exception 'You do not have permission to edit this recipe';
  end if;

  select household_id, visibility into v_household_id, v_visibility
  from public.recipes where id = p_recipe_id;

  update public.recipes set
    title = p_recipe->>'title',
    description = nullif(p_recipe->>'description', ''),
    source = nullif(p_recipe->>'source', ''),
    source_url = nullif(p_recipe->>'source_url', ''),
    author_name = nullif(p_recipe->>'author_name', ''),
    prep_time_minutes = nullif(p_recipe->>'prep_time_minutes', '')::int,
    cook_time_minutes = nullif(p_recipe->>'cook_time_minutes', '')::int,
    resting_time_minutes = nullif(p_recipe->>'resting_time_minutes', '')::int,
    servings = coalesce(nullif(p_recipe->>'servings', '')::numeric, 4),
    serving_size = nullif(p_recipe->>'serving_size', ''),
    finished_weight_grams = nullif(p_recipe->>'finished_weight_grams', '')::numeric,
    difficulty = nullif(p_recipe->>'difficulty', '')::recipe_difficulty,
    cuisine = nullif(p_recipe->>'cuisine', ''),
    meal_type = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'meal_type', '[]'::jsonb)) x), '{}'),
    cooking_method = nullif(p_recipe->>'cooking_method', ''),
    equipment = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'equipment', '[]'::jsonb)) x), '{}')
  where id = p_recipe_id;

  delete from public.recipe_ingredients where recipe_id = p_recipe_id;
  v_pos := 0;
  for v_ing in select * from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (recipe_id, position, ingredient_name, quantity, unit, preparation_note, brand)
    values (
      p_recipe_id, v_pos, v_ing->>'ingredient_name',
      nullif(v_ing->>'quantity', '')::numeric, nullif(v_ing->>'unit', '')::measurement_unit,
      nullif(v_ing->>'preparation_note', ''), nullif(v_ing->>'brand', '')
    );
    v_pos := v_pos + 1;
  end loop;

  delete from public.recipe_steps where recipe_id = p_recipe_id;
  v_pos := 0;
  for v_step in select * from jsonb_array_elements(coalesce(p_steps, '[]'::jsonb))
  loop
    insert into public.recipe_steps (recipe_id, position, instruction, duration_minutes, temperature_celsius, equipment, tip)
    values (
      p_recipe_id, v_pos, v_step->>'instruction',
      nullif(v_step->>'duration_minutes', '')::int, nullif(v_step->>'temperature_celsius', '')::int,
      nullif(v_step->>'equipment', ''), nullif(v_step->>'tip', '')
    );
    v_pos := v_pos + 1;
  end loop;

  if v_visibility = 'household' then
    perform public.log_activity(v_household_id, 'recipe_edited', 'recipe', p_recipe_id,
      jsonb_build_object('title', p_recipe->>'title'));
  end if;
end;
$$;

create or replace function public.duplicate_recipe(
  p_recipe_id uuid,
  p_target_visibility recipe_visibility,
  p_target_household_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.recipes%rowtype;
  v_new_id uuid;
begin
  if not public.can_view_recipe(p_recipe_id) then
    raise exception 'Recipe not found';
  end if;

  select * into v_src from public.recipes where id = p_recipe_id;

  if p_target_visibility = 'household' then
    if p_target_household_id is null then
      raise exception 'Choose a household to copy this recipe into';
    end if;
    if not public.has_household_role(p_target_household_id, 'editor') then
      raise exception 'You do not have permission to add recipes to this household';
    end if;
  end if;

  insert into public.recipes (
    household_id, visibility, original_author_id, title, description, source, source_url,
    author_name, prep_time_minutes, cook_time_minutes, resting_time_minutes, servings,
    serving_size, finished_weight_grams, difficulty, cuisine, meal_type, cooking_method, equipment
  ) values (
    case when p_target_visibility = 'household' then p_target_household_id else null end,
    p_target_visibility,
    coalesce(v_src.original_author_id, v_src.created_by),
    v_src.title, v_src.description, v_src.source, v_src.source_url, v_src.author_name,
    v_src.prep_time_minutes, v_src.cook_time_minutes, v_src.resting_time_minutes, v_src.servings,
    v_src.serving_size, v_src.finished_weight_grams, v_src.difficulty, v_src.cuisine,
    v_src.meal_type, v_src.cooking_method, v_src.equipment
  )
  returning id into v_new_id;

  insert into public.recipe_ingredients (recipe_id, position, ingredient_name, quantity, unit, preparation_note, brand, nutrition_override)
  select v_new_id, position, ingredient_name, quantity, unit, preparation_note, brand, nutrition_override
  from public.recipe_ingredients where recipe_id = p_recipe_id;

  insert into public.recipe_steps (recipe_id, position, instruction, duration_minutes, temperature_celsius, equipment, tip)
  select v_new_id, position, instruction, duration_minutes, temperature_celsius, equipment, tip
  from public.recipe_steps where recipe_id = p_recipe_id;

  if p_target_visibility = 'household' then
    perform public.log_activity(p_target_household_id, 'recipe_created', 'recipe', v_new_id,
      jsonb_build_object('title', v_src.title, 'duplicated_from', p_recipe_id));
  end if;

  return v_new_id;
end;
$$;

-- -------------------------------------------------------------------------
-- Storage: recipe-images bucket (private — served via signed URLs)
-- Path convention: recipes/{recipe_id}/{filename}
-- -------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', false)
on conflict (id) do nothing;

create policy recipe_images_storage_select on storage.objects
  for select using (
    bucket_id = 'recipe-images'
    and public.can_view_recipe(((storage.foldername(name))[2])::uuid)
  );

create policy recipe_images_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'recipe-images'
    and public.can_edit_recipe(((storage.foldername(name))[2])::uuid)
  );

create policy recipe_images_storage_update on storage.objects
  for update using (
    bucket_id = 'recipe-images'
    and public.can_edit_recipe(((storage.foldername(name))[2])::uuid)
  );

create policy recipe_images_storage_delete on storage.objects
  for delete using (
    bucket_id = 'recipe-images'
    and public.can_edit_recipe(((storage.foldername(name))[2])::uuid)
  );
