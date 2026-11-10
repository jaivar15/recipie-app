-- Lets a recipe's ingredients/instructions be split into labelled
-- components (e.g. "Black Sesame Paste" + "Ice Cream" for a recipe with
-- two sub-recipes combined into one). A section header is just a regular
-- recipe_ingredients/recipe_steps row with is_section_header = true,
-- ordered by `position` like any other row — its ingredient_name/
-- instruction text doubles as the section label, and it's rendered as a
-- heading (not a numbered ingredient/step) rather than stored separately.

alter table public.recipe_ingredients add column is_section_header boolean not null default false;
alter table public.recipe_steps add column is_section_header boolean not null default false;

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
  v_tag_id uuid;
  v_pos int;
  v_manual_labels text[];
  v_verified_labels text[];
  v_auto_labels text[];
  v_final_labels text[];
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

  v_manual_labels := public.strip_auto_dietary_labels(
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'dietary_labels', '[]'::jsonb)) x), '{}')
  );
  v_verified_labels := public.strip_auto_dietary_labels(
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'dietary_labels_verified', '[]'::jsonb)) x), '{}')
  );

  insert into public.recipes (
    household_id, visibility, title, description, source, source_url, author_name,
    prep_time_minutes, cook_time_minutes, resting_time_minutes, servings, serving_size,
    finished_weight_grams, difficulty, cuisine, meal_type, cooking_method, equipment,
    dietary_labels, dietary_labels_verified
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
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'equipment', '[]'::jsonb)) x), '{}'),
    v_manual_labels, v_verified_labels
  )
  returning id into v_recipe_id;

  v_pos := 0;
  for v_ing in select * from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (recipe_id, position, ingredient_name, quantity, unit, preparation_note, brand, ingredient_id, is_section_header)
    values (
      v_recipe_id, v_pos, v_ing->>'ingredient_name',
      nullif(v_ing->>'quantity', '')::numeric, nullif(v_ing->>'unit', '')::measurement_unit,
      nullif(v_ing->>'preparation_note', ''), nullif(v_ing->>'brand', ''),
      nullif(v_ing->>'ingredient_id', '')::uuid,
      coalesce((v_ing->>'is_section_header')::boolean, false)
    );
    v_pos := v_pos + 1;
  end loop;

  v_pos := 0;
  for v_step in select * from jsonb_array_elements(coalesce(p_steps, '[]'::jsonb))
  loop
    insert into public.recipe_steps (recipe_id, position, instruction, duration_minutes, temperature_celsius, equipment, tip, is_section_header)
    values (
      v_recipe_id, v_pos, v_step->>'instruction',
      nullif(v_step->>'duration_minutes', '')::int, nullif(v_step->>'temperature_celsius', '')::int,
      nullif(v_step->>'equipment', ''), nullif(v_step->>'tip', ''),
      coalesce((v_step->>'is_section_header')::boolean, false)
    );
    v_pos := v_pos + 1;
  end loop;

  for v_tag_id in select (x)::uuid from jsonb_array_elements_text(coalesce(p_recipe->'tag_ids', '[]'::jsonb)) x
  loop
    if public.can_view_tag(v_tag_id) then
      insert into public.recipe_tags (recipe_id, tag_id) values (v_recipe_id, v_tag_id)
      on conflict do nothing;
    end if;
  end loop;

  v_auto_labels := public.compute_auto_dietary_labels(v_recipe_id);
  v_final_labels := array(select distinct unnest(v_manual_labels || v_auto_labels));

  update public.recipes
  set
    dietary_labels = v_final_labels,
    dietary_labels_verified = (select coalesce(array_agg(x), '{}') from unnest(v_verified_labels) x where x = any(v_final_labels))
  where id = v_recipe_id;

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
  v_tag_id uuid;
  v_pos int;
  v_manual_labels text[];
  v_verified_labels text[];
  v_auto_labels text[];
  v_final_labels text[];
begin
  if not public.can_edit_recipe(p_recipe_id) then
    raise exception 'You do not have permission to edit this recipe';
  end if;

  select household_id, visibility into v_household_id, v_visibility
  from public.recipes where id = p_recipe_id;

  v_manual_labels := public.strip_auto_dietary_labels(
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'dietary_labels', '[]'::jsonb)) x), '{}')
  );
  v_verified_labels := public.strip_auto_dietary_labels(
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_recipe->'dietary_labels_verified', '[]'::jsonb)) x), '{}')
  );

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
    dietary_labels = v_manual_labels,
    dietary_labels_verified = v_verified_labels
  where id = p_recipe_id;

  delete from public.recipe_ingredients where recipe_id = p_recipe_id;
  v_pos := 0;
  for v_ing in select * from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (recipe_id, position, ingredient_name, quantity, unit, preparation_note, brand, ingredient_id, is_section_header)
    values (
      p_recipe_id, v_pos, v_ing->>'ingredient_name',
      nullif(v_ing->>'quantity', '')::numeric, nullif(v_ing->>'unit', '')::measurement_unit,
      nullif(v_ing->>'preparation_note', ''), nullif(v_ing->>'brand', ''),
      nullif(v_ing->>'ingredient_id', '')::uuid,
      coalesce((v_ing->>'is_section_header')::boolean, false)
    );
    v_pos := v_pos + 1;
  end loop;

  delete from public.recipe_steps where recipe_id = p_recipe_id;
  v_pos := 0;
  for v_step in select * from jsonb_array_elements(coalesce(p_steps, '[]'::jsonb))
  loop
    insert into public.recipe_steps (recipe_id, position, instruction, duration_minutes, temperature_celsius, equipment, tip, is_section_header)
    values (
      p_recipe_id, v_pos, v_step->>'instruction',
      nullif(v_step->>'duration_minutes', '')::int, nullif(v_step->>'temperature_celsius', '')::int,
      nullif(v_step->>'equipment', ''), nullif(v_step->>'tip', ''),
      coalesce((v_step->>'is_section_header')::boolean, false)
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

  v_auto_labels := public.compute_auto_dietary_labels(p_recipe_id);
  v_final_labels := array(select distinct unnest(v_manual_labels || v_auto_labels));

  update public.recipes
  set
    dietary_labels = v_final_labels,
    dietary_labels_verified = (select coalesce(array_agg(x), '{}') from unnest(v_verified_labels) x where x = any(v_final_labels))
  where id = p_recipe_id;

  if v_visibility = 'household' then
    perform public.log_activity(v_household_id, 'recipe_edited', 'recipe', p_recipe_id,
      jsonb_build_object('title', p_recipe->>'title'));
  end if;
end;
$$;
