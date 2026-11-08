-- =========================================================================
-- Phase 4: Organisation — tags, collections, dietary labels, saved filters
-- =========================================================================

-- Dietary labels are a fixed vocabulary applied directly to a recipe, with
-- a separate "verified" subset. Applying a label (even inferred from
-- ingredient data elsewhere in the app) never implies verification — only
-- a household member explicitly marking it verified does. Enforced in the
-- update_recipe_dietary_labels RPC below, not just trusted from the client.
alter table public.recipes add column dietary_labels text[] not null default '{}';
alter table public.recipes add column dietary_labels_verified text[] not null default '{}';

create or replace function public.update_recipe_dietary_labels(
  p_recipe_id uuid, p_labels text[], p_verified text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_edit_recipe(p_recipe_id) then
    raise exception 'You do not have permission to edit this recipe';
  end if;
  if exists (select 1 from unnest(p_verified) v where not v = any(p_labels)) then
    raise exception 'Cannot verify a label that is not applied';
  end if;
  update public.recipes
  set dietary_labels = p_labels, dietary_labels_verified = p_verified
  where id = p_recipe_id;
end;
$$;

-- -------------------------------------------------------------------------
-- tags — free-form, household-shared or personal
-- -------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  visibility recipe_visibility not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint tags_visibility_household_consistency check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and household_id is not null)
  )
);

create unique index tags_household_name_idx on public.tags (household_id, lower(name)) where visibility = 'household';
create unique index tags_personal_name_idx on public.tags (created_by, lower(name)) where visibility = 'personal';

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- -------------------------------------------------------------------------
-- collections — named groups of recipes ("Mum's Recipes", "Quick Lunches")
-- -------------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  visibility recipe_visibility not null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_visibility_household_consistency check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and household_id is not null)
  )
);

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

create table public.collection_recipes (
  collection_id uuid not null references public.collections (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position int not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, recipe_id)
);

-- -------------------------------------------------------------------------
-- saved_filters — always personal to the user who saved them
-- -------------------------------------------------------------------------

create table public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  household_id uuid references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  filter jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Permission helpers
-- -------------------------------------------------------------------------

create or replace function public.can_view_tag(p_tag_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tags t
    where t.id = p_tag_id
      and (
        (t.visibility = 'personal' and t.created_by = auth.uid())
        or (t.visibility = 'household' and public.is_household_member(t.household_id))
      )
  );
$$;

create or replace function public.can_edit_tag(p_tag_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tags t
    where t.id = p_tag_id
      and (
        (t.visibility = 'personal' and t.created_by = auth.uid())
        or (t.visibility = 'household' and public.has_household_role(t.household_id, 'editor'))
      )
  );
$$;

create or replace function public.can_view_collection(p_collection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.collections c
    where c.id = p_collection_id
      and (
        (c.visibility = 'personal' and c.created_by = auth.uid())
        or (c.visibility = 'household' and public.is_household_member(c.household_id))
      )
  );
$$;

create or replace function public.can_edit_collection(p_collection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.collections c
    where c.id = p_collection_id
      and (
        (c.visibility = 'personal' and c.created_by = auth.uid())
        or (c.visibility = 'household' and public.has_household_role(c.household_id, 'editor'))
      )
  );
$$;

-- -------------------------------------------------------------------------
-- Attribution triggers
-- -------------------------------------------------------------------------

create or replace function public.set_tag_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by = auth.uid();
  if new.visibility = 'household' then
    if new.household_id is null then
      raise exception 'Household tags must have a household_id';
    end if;
    if not public.has_household_role(new.household_id, 'editor') then
      raise exception 'You do not have permission to add tags to this household';
    end if;
  elsif new.household_id is not null then
    raise exception 'Personal tags cannot have a household_id';
  end if;
  return new;
end;
$$;

create trigger tags_set_creator
  before insert on public.tags
  for each row execute function public.set_tag_creator();

create or replace function public.set_collection_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by = auth.uid();
  if new.visibility = 'household' then
    if new.household_id is null then
      raise exception 'Household collections must have a household_id';
    end if;
    if not public.has_household_role(new.household_id, 'editor') then
      raise exception 'You do not have permission to add collections to this household';
    end if;
  elsif new.household_id is not null then
    raise exception 'Personal collections cannot have a household_id';
  end if;
  return new;
end;
$$;

create trigger collections_set_creator
  before insert on public.collections
  for each row execute function public.set_collection_creator();

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

alter table public.tags enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_recipes enable row level security;
alter table public.saved_filters enable row level security;

create policy tags_select on public.tags
  for select using (
    (visibility = 'personal' and created_by = auth.uid())
    or (visibility = 'household' and public.is_household_member(household_id))
  );
create policy tags_insert on public.tags
  for insert with check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and public.has_household_role(household_id, 'editor'))
  );
create policy tags_delete on public.tags
  for delete using (public.can_edit_tag(id));

create policy recipe_tags_select on public.recipe_tags
  for select using (public.can_view_recipe(recipe_id));
create policy recipe_tags_write on public.recipe_tags
  for all using (public.can_edit_recipe(recipe_id) and public.can_view_tag(tag_id))
  with check (public.can_edit_recipe(recipe_id) and public.can_view_tag(tag_id));

create policy collections_select on public.collections
  for select using (
    (visibility = 'personal' and created_by = auth.uid())
    or (visibility = 'household' and public.is_household_member(household_id))
  );
create policy collections_insert on public.collections
  for insert with check (
    (visibility = 'personal' and household_id is null)
    or (visibility = 'household' and public.has_household_role(household_id, 'editor'))
  );
create policy collections_update on public.collections
  for update using (public.can_edit_collection(id)) with check (public.can_edit_collection(id));
create policy collections_delete on public.collections
  for delete using (public.can_edit_collection(id));

create policy collection_recipes_select on public.collection_recipes
  for select using (public.can_view_collection(collection_id));
create policy collection_recipes_write on public.collection_recipes
  for all using (public.can_edit_collection(collection_id) and public.can_view_recipe(recipe_id))
  with check (public.can_edit_collection(collection_id) and public.can_view_recipe(recipe_id));

create policy saved_filters_all on public.saved_filters
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
