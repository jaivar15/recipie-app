-- =========================================================================
-- Health & Fitness Phase 5 — personalised meal planning.
--
-- The ONLY cross-user visibility added anywhere in the health schema: a
-- household member's food preferences (vegetarian, gluten-free, etc.)
-- become visible to their other household members, but ONLY when that
-- member has explicitly opted in via share_preferences_with_household,
-- and ONLY the health_preferences row itself — weight, measurements,
-- nutrition goals, food diary and every other health table remain
-- strictly user_id = auth.uid(), completely untouched by this migration.
-- =========================================================================

create policy health_preferences_shared_with_household on public.health_preferences
  for select
  using (
    share_preferences_with_household = true
    and exists (
      select 1
      from public.household_members hm_me
      join public.household_members hm_them on hm_them.household_id = hm_me.household_id
      where hm_me.user_id = auth.uid()
        and hm_them.user_id = health_preferences.user_id
    )
  );
