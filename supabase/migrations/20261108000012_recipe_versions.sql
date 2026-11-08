-- =========================================================================
-- Phase 6: Recipe version history
-- Snapshots are taken of the PRE-EDIT state inside update_recipe, so
-- version N always represents "the recipe as it looked before edit N was
-- applied" — restoring is just calling update_recipe again with an old
-- snapshot's payload, which itself creates a new snapshot of the state
-- just before the restore. No separate restore path to keep in sync.
-- =========================================================================

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  version_number int not null,
  snapshot jsonb not null,
  edited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),

  unique (recipe_id, version_number)
);

create index recipe_versions_recipe_idx on public.recipe_versions (recipe_id, version_number desc);

alter table public.recipe_versions enable row level security;

create policy recipe_versions_select on public.recipe_versions
  for select using (public.can_view_recipe(recipe_id));

-- No insert/update/delete policy: rows are only ever written by
-- update_recipe (SECURITY DEFINER), never directly by clients.

create or replace function public.update_recipe(p_recipe_id uuid, p_recipe jsonb, p_ingredients jsonb, p_steps jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_visibility recipe_visibility;
  v_last_edited_by uuid;
  v_snapshot jsonb;
  v_next_version int;
  v_ing jsonb;
  v_step jsonb;
  v_tag_id uuid;
  v_pos int;
begin
  if not public.can_edit_recipe(p_recipe_id) then
    raise exception 'You do not have permission to edit this recipe';
  end if;

  select household_id, visibility, last_edited_by into v_household_id, v_visibility, v_last_edited_by
  from public.recipes where id = p_recipe_id;

  -- Snapshot the pre-edit state before mutating anything.
  select jsonb_build_object(
    'recipe', jsonb_build_object(
      'visibility', r.visibility, 'household_id', r.household_id,
      'title', r.title, 'description', r.description, 'source', r.source, 'source_url', r.source_url,
      'author_name', r.author_name, 'prep_time_minutes', r.prep_time_minutes, 'cook_time_minutes', r.cook_time_minutes,
      'resting_time_minutes', r.resting_time_minutes, 'servings', r.servings, 'serving_size', r.serving_size,
      'finished_weight_grams', r.finished_weight_grams, 'difficulty', r.difficulty, 'cuisine', r.cuisine,
      'meal_type', to_jsonb(r.meal_type), 'cooking_method', r.cooking_method, 'equipment', to_jsonb(r.equipment),
      'dietary_labels', to_jsonb(r.dietary_labels), 'dietary_labels_verified', to_jsonb(r.dietary_labels_verified),
      'tag_ids', coalesce((select jsonb_agg(rt.tag_id) from public.recipe_tags rt where rt.recipe_id = r.id), '[]'::jsonb)
    ),
    'ingredients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ingredient_name', ri.ingredient_name, 'quantity', ri.quantity, 'unit', ri.unit,
        'preparation_note', ri.preparation_note, 'brand', ri.brand, 'ingredient_id', ri.ingredient_id
      ) order by ri.position)
      from public.recipe_ingredients ri where ri.recipe_id = r.id
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'instruction', rs.instruction, 'duration_minutes', rs.duration_minutes,
        'temperature_celsius', rs.temperature_celsius, 'equipment', rs.equipment, 'tip', rs.tip
      ) order by rs.position)
      from public.recipe_steps rs where rs.recipe_id = r.id
    ), '[]'::jsonb)
  )
  into v_snapshot
  from public.recipes r where r.id = p_recipe_id;

  select coalesce(max(version_number), 0) + 1 into v_next_version
  from public.recipe_versions where recipe_id = p_recipe_id;

  insert into public.recipe_versions (recipe_id, version_number, snapshot, edited_by)
  values (p_recipe_id, v_next_version, v_snapshot, coalesce(v_last_edited_by, auth.uid()));

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
    equipment = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'equipment', '[]'::jsonb)) x), '{}'),
    dietary_labels = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'dietary_labels', '[]'::jsonb)) x), '{}'),
    dietary_labels_verified = coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'dietary_labels_verified', '[]'::jsonb)) x), '{}'),
    last_edited_by = auth.uid()
  where id = p_recipe_id;

  delete from public.recipe_ingredients where recipe_id = p_recipe_id;
  v_pos := 0;
  for v_ing in select * from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (recipe_id, position, ingredient_name, quantity, unit, preparation_note, brand, ingredient_id)
    values (
      p_recipe_id, v_pos, v_ing->>'ingredient_name',
      nullif(v_ing->>'quantity', '')::numeric, nullif(v_ing->>'unit', '')::measurement_unit,
      nullif(v_ing->>'preparation_note', ''), nullif(v_ing->>'brand', ''),
      nullif(v_ing->>'ingredient_id', '')::uuid
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

  delete from public.recipe_tags where recipe_id = p_recipe_id;
  for v_tag_id in select (x)::uuid from jsonb_array_elements_text(coalesce(p_recipe->'tag_ids', '[]'::jsonb)) x
  loop
    if public.can_view_tag(v_tag_id) then
      insert into public.recipe_tags (recipe_id, tag_id) values (p_recipe_id, v_tag_id)
      on conflict do nothing;
    end if;
  end loop;

  if v_visibility = 'household' then
    perform public.log_activity(v_household_id, 'recipe_edited', 'recipe', p_recipe_id,
      jsonb_build_object('title', p_recipe->>'title'));
  end if;
end;
$$;
