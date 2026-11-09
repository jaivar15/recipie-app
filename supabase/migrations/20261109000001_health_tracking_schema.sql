-- =========================================================================
-- Health & Fitness extension — Phase 1: schema, RLS, private storage.
--
-- Every table here is PER-USER, not household data. None of them join
-- through household_id or is_household_member(); RLS is a flat
-- "user_id = auth.uid()" ownership check, full stop. Household owners,
-- editors and the household_activity_logs trail never see this data —
-- these tables are never written to by log_activity(), and no RLS policy
-- here references household membership at all.
-- =========================================================================

create type public.biological_sex as enum ('male', 'female', 'other', 'prefer_not_to_say');
create type public.activity_level as enum ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');
create type public.nutrition_goal_mode as enum ('maintenance', 'loss', 'gain', 'custom');
create type public.exercise_activity_type as enum ('walking', 'yoga', 'muay_thai', 'strength_training', 'cycling', 'running', 'swimming', 'other');
create type public.exercise_intensity as enum ('low', 'moderate', 'high');
create type public.food_diary_meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'drink');
create type public.food_source_type as enum ('recipe', 'ingredient', 'custom');

-- -------------------------------------------------------------------------
-- health_profiles — one row per user. Deliberately no diagnosis/medical
-- fields, just the inputs needed for unit display and the optional
-- Mifflin-St Jeor estimate.
-- -------------------------------------------------------------------------

create table public.health_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  height_cm numeric(5, 1) check (height_cm > 0),
  starting_weight_kg numeric(5, 2) check (starting_weight_kg > 0),
  current_weight_kg numeric(5, 2) check (current_weight_kg > 0),
  target_weight_kg numeric(5, 2) check (target_weight_kg > 0),
  date_of_birth date,
  sex public.biological_sex,
  activity_level public.activity_level,
  dietary_preferences text[] not null default '{}',
  allergies text[] not null default '{}',
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  energy_unit text not null default 'kcal' check (energy_unit in ('kcal', 'kj')),
  exercise_preferences text[] not null default '{}',
  weigh_in_reminder_enabled boolean not null default false,
  weigh_in_reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger health_profiles_set_updated_at
  before update on public.health_profiles
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- nutrition_goals — one row per user, manually adjustable at any time.
-- estimated_tdee is stored only for transparency ("here's what we
-- estimated, you can override it") — calorie_target is never silently
-- recalculated out from under the user.
-- -------------------------------------------------------------------------

create table public.nutrition_goals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  goal_mode public.nutrition_goal_mode not null default 'maintenance',
  rate_kg_per_week numeric(3, 2) check (rate_kg_per_week is null or (rate_kg_per_week > 0 and rate_kg_per_week <= 1.0)),
  calorie_target int check (calorie_target is null or calorie_target >= 1000),
  protein_target_g numeric(6, 1) check (protein_target_g is null or protein_target_g >= 0),
  carb_target_g numeric(6, 1) check (carb_target_g is null or carb_target_g >= 0),
  fat_target_g numeric(6, 1) check (fat_target_g is null or fat_target_g >= 0),
  fibre_target_g numeric(6, 1) check (fibre_target_g is null or fibre_target_g >= 0),
  water_target_ml int check (water_target_ml is null or water_target_ml > 0),
  estimated_tdee int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger nutrition_goals_set_updated_at
  before update on public.nutrition_goals
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- weight_entries — multiple per day allowed. The "entry of record" for a
-- given day is defined (in application code) as the most recent by
-- entry_time, falling back to created_at — never silently averaged.
-- -------------------------------------------------------------------------

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  entry_time time,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index weight_entries_user_date_idx on public.weight_entries (user_id, entry_date desc, created_at desc);

-- -------------------------------------------------------------------------
-- body_measurements
-- -------------------------------------------------------------------------

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  waist_cm numeric(5, 1) check (waist_cm is null or waist_cm > 0),
  hips_cm numeric(5, 1) check (hips_cm is null or hips_cm > 0),
  chest_cm numeric(5, 1) check (chest_cm is null or chest_cm > 0),
  neck_cm numeric(5, 1) check (neck_cm is null or neck_cm > 0),
  upper_arm_cm numeric(5, 1) check (upper_arm_cm is null or upper_arm_cm > 0),
  thigh_cm numeric(5, 1) check (thigh_cm is null or thigh_cm > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index body_measurements_user_date_idx on public.body_measurements (user_id, entry_date desc);

-- -------------------------------------------------------------------------
-- progress_photos — private storage, explicit per-photo consent is the
-- act of uploading it; never surfaced to anyone but the owner.
-- -------------------------------------------------------------------------

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index progress_photos_user_date_idx on public.progress_photos (user_id, entry_date desc);

-- -------------------------------------------------------------------------
-- exercise_entries — estimated_calories is explicitly an estimate; the
-- food diary never auto-adds it to a calorie budget.
-- -------------------------------------------------------------------------

create table public.exercise_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  activity_type public.exercise_activity_type not null,
  duration_minutes int not null check (duration_minutes > 0),
  intensity public.exercise_intensity,
  distance_km numeric(6, 2) check (distance_km is null or distance_km >= 0),
  steps int check (steps is null or steps >= 0),
  estimated_calories int check (estimated_calories is null or estimated_calories >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index exercise_entries_user_date_idx on public.exercise_entries (user_id, entry_date desc);

-- -------------------------------------------------------------------------
-- water_entries — quick-add, multiple per day, summed for the daily total.
-- -------------------------------------------------------------------------

create table public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  amount_ml int not null check (amount_ml > 0),
  logged_at timestamptz not null default now()
);

create index water_entries_user_date_idx on public.water_entries (user_id, entry_date desc);

-- -------------------------------------------------------------------------
-- food_diary_entries — what was actually eaten, distinct from the
-- household meal planner's meal_plan_entries (what's *planned*). Can
-- reference a shared recipe, a database ingredient, or free text.
-- -------------------------------------------------------------------------

create table public.food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  meal_type public.food_diary_meal_type not null,
  source_type public.food_source_type not null,
  recipe_id uuid references public.recipes (id) on delete set null,
  ingredient_id uuid references public.ingredients (id) on delete set null,
  custom_food_name text,
  servings numeric(6, 2) check (servings is null or servings > 0),
  quantity_grams numeric(8, 2) check (quantity_grams is null or quantity_grams > 0),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),

  constraint food_diary_source_consistency check (
    (source_type = 'recipe' and recipe_id is not null and servings is not null)
    or (source_type = 'ingredient' and ingredient_id is not null and quantity_grams is not null)
    or (source_type = 'custom' and custom_food_name is not null)
  )
);

create index food_diary_entries_user_date_idx on public.food_diary_entries (user_id, entry_date desc, logged_at);

-- -------------------------------------------------------------------------
-- food_diary_nutrition_snapshots — immutable 1:1 snapshot taken at log
-- time. Later edits to a recipe or ingredient's nutrition data never
-- rewrite history: this table is only ever inserted into, never updated
-- by anything except deleting the parent entry.
-- -------------------------------------------------------------------------

create table public.food_diary_nutrition_snapshots (
  food_diary_entry_id uuid primary key references public.food_diary_entries (id) on delete cascade,
  calories_kcal numeric(8, 1),
  protein_g numeric(8, 2),
  carbohydrate_g numeric(8, 2),
  fat_g numeric(8, 2),
  saturated_fat_g numeric(8, 2),
  fibre_g numeric(8, 2),
  sugars_g numeric(8, 2),
  sodium_mg numeric(8, 1),
  iron_mg numeric(8, 2),
  calcium_mg numeric(8, 1),
  potassium_mg numeric(8, 1),
  magnesium_mg numeric(8, 1),
  vitamin_b12_ug numeric(8, 2),
  folate_ug numeric(8, 1),
  calories_complete boolean not null default false,
  protein_complete boolean not null default false,
  carbs_complete boolean not null default false,
  fat_complete boolean not null default false,
  fibre_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- health_preferences — dietary/informational filters only, explicitly
-- not medical diagnoses. share_preferences_with_household is the one
-- opt-in bridge into the shared meal planner (never weight/measurements).
-- -------------------------------------------------------------------------

create table public.health_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  strict_gluten_free boolean not null default false,
  vegetarian boolean not null default false,
  low_fodmap boolean not null default false,
  higher_fibre boolean not null default false,
  lower_saturated_fat boolean not null default false,
  protein_focused boolean not null default false,
  share_preferences_with_household boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger health_preferences_set_updated_at
  before update on public.health_preferences
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- RLS — flat per-user ownership, no household logic anywhere below.
-- -------------------------------------------------------------------------

alter table public.health_profiles enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.weight_entries enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.exercise_entries enable row level security;
alter table public.water_entries enable row level security;
alter table public.food_diary_entries enable row level security;
alter table public.food_diary_nutrition_snapshots enable row level security;
alter table public.health_preferences enable row level security;

create policy health_profiles_owner on public.health_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nutrition_goals_owner on public.nutrition_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy weight_entries_owner on public.weight_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy body_measurements_owner on public.body_measurements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_photos_owner on public.progress_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercise_entries_owner on public.exercise_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy water_entries_owner on public.water_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy food_diary_entries_owner on public.food_diary_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy health_preferences_owner on public.health_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy food_diary_nutrition_snapshots_owner on public.food_diary_nutrition_snapshots
  for all using (
    exists (select 1 from public.food_diary_entries e where e.id = food_diary_entry_id and e.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.food_diary_entries e where e.id = food_diary_entry_id and e.user_id = auth.uid())
  );

-- -------------------------------------------------------------------------
-- Storage: progress-photos bucket (private). Path convention:
-- {user_id}/{filename} — RLS keys off the first path segment.
-- -------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy progress_photos_storage_select on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy progress_photos_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy progress_photos_storage_delete on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
