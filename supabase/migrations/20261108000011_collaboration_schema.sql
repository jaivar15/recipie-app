-- =========================================================================
-- Phase 5: Collaboration
-- Shared weekly meal planner and collaborative shopping lists. Both are
-- household-scoped (no personal variant — these are inherently shared).
-- Follows the same visibility/RLS conventions as tags/collections (Phase 4):
-- direct table access secured by RLS, no RPC layer needed since there is
-- no cross-table atomicity requirement beyond what a single INSERT/UPDATE
-- statement already guarantees.
-- =========================================================================

create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- -------------------------------------------------------------------------
-- meal_plans / meal_plan_entries / meal_plan_member_portions
-- -------------------------------------------------------------------------

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null default 'Meal Plan' check (char_length(btrim(name)) between 1 and 80),
  start_date date not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index meal_plans_household_idx on public.meal_plans (household_id, start_date desc);

create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  custom_title text check (custom_title is null or char_length(btrim(custom_title)) > 0),
  entry_date date not null,
  meal_type meal_type not null,
  servings numeric(6, 2) not null default 1 check (servings > 0),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),

  constraint meal_plan_entries_recipe_or_title check (recipe_id is not null or custom_title is not null)
);

create index meal_plan_entries_plan_date_idx on public.meal_plan_entries (meal_plan_id, entry_date);

create table public.meal_plan_member_portions (
  id uuid primary key default gen_random_uuid(),
  meal_plan_entry_id uuid not null references public.meal_plan_entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  portions numeric(4, 2) not null default 1 check (portions > 0),

  unique (meal_plan_entry_id, user_id)
);

-- -------------------------------------------------------------------------
-- shopping_lists / shopping_list_items
-- -------------------------------------------------------------------------

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null default 'Shopping List' check (char_length(btrim(name)) between 1 and 80),
  is_archived boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index shopping_lists_household_idx on public.shopping_lists (household_id) where is_archived = false;

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  ingredient_name text not null check (char_length(btrim(ingredient_name)) > 0),
  quantity numeric(10, 3) check (quantity >= 0),
  unit measurement_unit,
  category text,
  is_checked boolean not null default false,
  checked_by uuid references public.profiles (id),
  checked_at timestamptz,
  added_by uuid references public.profiles (id),
  recipe_id uuid references public.recipes (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index shopping_list_items_list_idx on public.shopping_list_items (shopping_list_id, sort_order);

-- -------------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------------

alter table public.meal_plans enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.meal_plan_member_portions enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;

create policy meal_plans_select on public.meal_plans
  for select using (public.is_household_member(household_id));
create policy meal_plans_write on public.meal_plans
  for all using (public.has_household_role(household_id, 'editor'))
  with check (public.has_household_role(household_id, 'editor'));

create policy meal_plan_entries_select on public.meal_plan_entries
  for select using (
    exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id and public.is_household_member(mp.household_id))
  );
create policy meal_plan_entries_write on public.meal_plan_entries
  for all using (
    exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id and public.has_household_role(mp.household_id, 'editor'))
  )
  with check (
    exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id and public.has_household_role(mp.household_id, 'editor'))
  );

create policy meal_plan_member_portions_select on public.meal_plan_member_portions
  for select using (
    exists (
      select 1 from public.meal_plan_entries e
      join public.meal_plans mp on mp.id = e.meal_plan_id
      where e.id = meal_plan_entry_id and public.is_household_member(mp.household_id)
    )
  );
create policy meal_plan_member_portions_write on public.meal_plan_member_portions
  for all using (
    exists (
      select 1 from public.meal_plan_entries e
      join public.meal_plans mp on mp.id = e.meal_plan_id
      where e.id = meal_plan_entry_id and public.has_household_role(mp.household_id, 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.meal_plan_entries e
      join public.meal_plans mp on mp.id = e.meal_plan_id
      where e.id = meal_plan_entry_id and public.has_household_role(mp.household_id, 'editor')
    )
  );

create policy shopping_lists_select on public.shopping_lists
  for select using (public.is_household_member(household_id));
create policy shopping_lists_write on public.shopping_lists
  for all using (public.has_household_role(household_id, 'editor'))
  with check (public.has_household_role(household_id, 'editor'));

-- Items: any household member (including viewers) can check items off and
-- add/edit quantities while shopping — this is a low-stakes collaborative
-- action distinct from list/plan structure, which stays editor+.
create policy shopping_list_items_select on public.shopping_list_items
  for select using (
    exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.is_household_member(sl.household_id))
  );
create policy shopping_list_items_write on public.shopping_list_items
  for all using (
    exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.is_household_member(sl.household_id))
  )
  with check (
    exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.is_household_member(sl.household_id))
  );

-- -------------------------------------------------------------------------
-- toggle_shopping_list_item — atomic flip, avoids read-modify-write races
-- when two members check the same item off at nearly the same time.
-- -------------------------------------------------------------------------

create or replace function public.toggle_shopping_list_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list_id uuid;
  v_checked boolean;
begin
  select shopping_list_id into v_list_id from public.shopping_list_items where id = p_item_id;
  if v_list_id is null then
    raise exception 'Shopping list item not found';
  end if;
  if not exists (
    select 1 from public.shopping_lists sl where sl.id = v_list_id and public.is_household_member(sl.household_id)
  ) then
    raise exception 'You do not have access to this shopping list';
  end if;

  update public.shopping_list_items
  set is_checked = not is_checked,
      checked_by = case when not is_checked then auth.uid() else null end,
      checked_at = case when not is_checked then now() else null end
  where id = p_item_id
  returning is_checked into v_checked;

  return v_checked;
end;
$$;
