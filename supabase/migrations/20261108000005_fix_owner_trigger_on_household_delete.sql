-- check_household_has_owner_row() fired even when the household row itself
-- was being deleted: deleting a household cascades to household_members,
-- and removing the last (owner) row tripped the "must always have an
-- owner" check, making households undeletable at the database level. The
-- invariant should only hold while the household still exists.

create or replace function public.check_household_has_owner_row()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.households where id = old.household_id)
     and not exists (
    select 1 from public.household_members
    where household_id = old.household_id and role = 'owner'
  ) then
    raise exception 'Household must always have an owner';
  end if;
  return null;
end;
$$;
