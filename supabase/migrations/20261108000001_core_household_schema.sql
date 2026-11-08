-- =========================================================================
-- My Family Recipe Vault — Phase 1: Core household / auth schema
-- Tenant boundary = household_id. Never email or household name.
-- =========================================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------------------

create type household_role as enum ('owner', 'editor', 'viewer');
create type invitation_status as enum ('pending', 'accepted', 'declined', 'revoked', 'expired');

-- -------------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- -------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  default_household_id uuid,
  measurement_system text not null default 'metric' check (measurement_system in ('metric', 'imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user. Created automatically on signup.';

-- -------------------------------------------------------------------------
-- households
-- -------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  image_url text,
  owner_id uuid not null references public.profiles (id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

alter table public.profiles
  add constraint profiles_default_household_fk
  foreign key (default_household_id) references public.households (id) on delete set null;

create index households_owner_idx on public.households (owner_id);
create index households_not_deleted_idx on public.households (id) where deleted_at is null;

-- -------------------------------------------------------------------------
-- household_members — the tenant membership join table
-- -------------------------------------------------------------------------

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role household_role not null default 'viewer',
  invited_by uuid references public.profiles (id),
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_members_user_idx on public.household_members (user_id);
create index household_members_household_idx on public.household_members (household_id);

-- -------------------------------------------------------------------------
-- household_invitations
-- -------------------------------------------------------------------------

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  role household_role not null default 'viewer' check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid not null references public.profiles (id),
  status invitation_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  accepted_by uuid references public.profiles (id)
);

create index household_invitations_household_idx on public.household_invitations (household_id);
create index household_invitations_email_idx on public.household_invitations (lower(email));
-- Duplicate-invitation prevention: at most one pending invite per household+email.
create unique index household_invitations_pending_unique
  on public.household_invitations (household_id, lower(email))
  where (status = 'pending');

-- -------------------------------------------------------------------------
-- household_activity_logs — append-only audit trail
-- -------------------------------------------------------------------------

create table public.household_activity_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index household_activity_logs_household_idx
  on public.household_activity_logs (household_id, created_at desc);

-- -------------------------------------------------------------------------
-- updated_at trigger helper
-- -------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------------
-- New auth.users -> profiles bridge
-- -------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- Invariant: a household must always have at least one owner.
-- Deferred constraint trigger lets transfer_household_ownership swap two
-- rows atomically within one transaction.
-- -------------------------------------------------------------------------

create or replace function public.check_household_has_owner_row()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.household_members
    where household_id = old.household_id and role = 'owner'
  ) then
    raise exception 'Household must always have an owner';
  end if;
  return null;
end;
$$;

create constraint trigger household_members_require_owner
  after update or delete on public.household_members
  deferrable initially deferred
  for each row
  when (old.role = 'owner')
  execute function public.check_household_has_owner_row();

-- A member's default_household_id may only point at a household they belong to.
create or replace function public.check_default_household_membership()
returns trigger
language plpgsql
as $$
begin
  if new.default_household_id is not null and not exists (
    select 1 from public.household_members
    where household_id = new.default_household_id and user_id = new.id
  ) then
    raise exception 'Cannot set default household to one you are not a member of';
  end if;
  return new;
end;
$$;

create trigger profiles_check_default_household
  before insert or update of default_household_id on public.profiles
  for each row execute function public.check_default_household_membership();

-- -------------------------------------------------------------------------
-- Permission helper functions (SECURITY DEFINER to avoid RLS recursion).
-- Used throughout this migration's policies and every later phase's RLS.
-- -------------------------------------------------------------------------

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id and user_id = auth.uid()
  );
$$;

create or replace function public.current_household_role(p_household_id uuid)
returns household_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.household_members
  where household_id = p_household_id and user_id = auth.uid();
$$;

create or replace function public.has_household_role(p_household_id uuid, p_min_role household_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_min_role
    when 'viewer' then exists (
      select 1 from public.household_members
      where household_id = p_household_id and user_id = auth.uid()
    )
    when 'editor' then exists (
      select 1 from public.household_members
      where household_id = p_household_id and user_id = auth.uid() and role in ('editor', 'owner')
    )
    when 'owner' then exists (
      select 1 from public.household_members
      where household_id = p_household_id and user_id = auth.uid() and role = 'owner'
    )
  end;
$$;

create or replace function public.shares_household_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members them
      on them.household_id = me.household_id and them.user_id = p_user_id
    where me.user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;
alter table public.household_activity_logs enable row level security;

-- profiles: see yourself, or members you share a household with (for author
-- attribution, member lists, activity logs). Only self can update.
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.shares_household_with(id));

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- households: members only. No direct INSERT/DELETE policy — creation goes
-- through create_household(), deletion through archive/restore RPCs, so
-- regular users cannot fabricate a household row or hard-delete one.
create policy households_select on public.households
  for select using (public.is_household_member(id));

create policy households_update_owner on public.households
  for update using (public.has_household_role(id, 'owner'))
  with check (public.has_household_role(id, 'owner'));

-- household_members: members can see the roster. No direct write policy —
-- every mutation (join, role change, removal, leave, transfer) goes through
-- a SECURITY DEFINER RPC below, which is what prevents self-escalation.
create policy household_members_select on public.household_members
  for select using (public.is_household_member(household_id));

-- household_invitations: owner sees all invites for their household; an
-- invitee can see invitations addressed to their own verified email.
create policy household_invitations_select on public.household_invitations
  for select using (
    public.has_household_role(household_id, 'owner')
    or lower(email) = lower((select email from public.profiles where id = auth.uid()))
  );

-- household_activity_logs: members can read, append-only via log_activity().
create policy household_activity_logs_select on public.household_activity_logs
  for select using (public.is_household_member(household_id));

-- -------------------------------------------------------------------------
-- Privileged operations as SECURITY DEFINER RPCs
-- -------------------------------------------------------------------------

create or replace function public.log_activity(
  p_household_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Not a member of this household';
  end if;

  insert into public.household_activity_logs (household_id, actor_id, action, resource_type, resource_id, metadata)
  values (p_household_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  insert into public.households (name, owner_id)
  values (p_name, auth.uid())
  returning id into v_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, auth.uid(), 'owner');

  update public.profiles set default_household_id = v_household_id where id = auth.uid();

  perform public.log_activity(v_household_id, 'household_created', 'household', v_household_id, '{}'::jsonb);

  return v_household_id;
end;
$$;

create or replace function public.create_invitation(
  p_household_id uuid,
  p_email text,
  p_role household_role
) returns table (invitation_id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_hash text;
  v_id uuid;
  v_expires timestamptz := now() + interval '7 days';
begin
  if not public.has_household_role(p_household_id, 'owner') then
    raise exception 'Only the household owner can send invitations';
  end if;
  if p_role = 'owner' then
    raise exception 'Cannot invite directly as owner; use ownership transfer instead';
  end if;
  if exists (
    select 1 from public.household_members hm
    join public.profiles pr on pr.id = hm.user_id
    where hm.household_id = p_household_id and lower(pr.email) = lower(p_email)
  ) then
    raise exception 'This person is already a member of the household';
  end if;
  if exists (
    select 1 from public.household_invitations
    where household_id = p_household_id and lower(email) = lower(p_email) and status = 'pending'
  ) then
    raise exception 'An invitation is already pending for this email';
  end if;

  v_token := encode(gen_random_bytes(32), 'base64');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.household_invitations (household_id, email, role, token_hash, invited_by, expires_at)
  values (p_household_id, lower(p_email), p_role, v_hash, auth.uid(), v_expires)
  returning id into v_id;

  perform public.log_activity(p_household_id, 'member_invited', 'household_invitation', v_id,
    jsonb_build_object('email', lower(p_email), 'role', p_role));

  return query select v_id, v_token, v_expires;
end;
$$;

create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id from public.household_invitations where id = p_invitation_id;
  if v_household_id is null then
    raise exception 'Invitation not found';
  end if;
  if not public.has_household_role(v_household_id, 'owner') then
    raise exception 'Only the household owner can revoke invitations';
  end if;

  update public.household_invitations
  set status = 'revoked', responded_at = now()
  where id = p_invitation_id and status = 'pending';

  perform public.log_activity(v_household_id, 'invitation_revoked', 'household_invitation', p_invitation_id, '{}'::jsonb);
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_inv public.household_invitations%rowtype;
  v_email text;
begin
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then
    raise exception 'You must be signed in to accept an invitation';
  end if;

  select * into v_inv from public.household_invitations
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'This invitation has already been used, declined, or revoked';
  end if;
  if v_inv.expires_at < now() then
    update public.household_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'This invitation has expired';
  end if;
  if lower(v_email) <> lower(v_inv.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  insert into public.household_members (household_id, user_id, role, invited_by)
  values (v_inv.household_id, auth.uid(), v_inv.role, v_inv.invited_by)
  on conflict (household_id, user_id) do nothing;

  update public.household_invitations
  set status = 'accepted', responded_at = now(), accepted_by = auth.uid()
  where id = v_inv.id;

  update public.profiles
  set default_household_id = coalesce(default_household_id, v_inv.household_id)
  where id = auth.uid();

  perform public.log_activity(v_inv.household_id, 'member_joined', 'household_member', auth.uid(),
    jsonb_build_object('role', v_inv.role));

  return v_inv.household_id;
end;
$$;

create or replace function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_inv public.household_invitations%rowtype;
  v_email text;
begin
  select email into v_email from public.profiles where id = auth.uid();

  select * into v_inv from public.household_invitations
  where token_hash = v_hash
  for update;

  if not found or v_inv.status <> 'pending' then
    raise exception 'Invitation not found or no longer pending';
  end if;
  if lower(v_email) <> lower(v_inv.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  update public.household_invitations
  set status = 'declined', responded_at = now()
  where id = v_inv.id;
end;
$$;

create or replace function public.change_member_role(
  p_household_id uuid,
  p_member_user_id uuid,
  p_new_role household_role
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_household_role(p_household_id, 'owner') then
    raise exception 'Only the household owner can change member roles';
  end if;
  if p_new_role = 'owner' then
    raise exception 'Use transfer_household_ownership to change the owner';
  end if;
  if p_member_user_id = auth.uid() then
    raise exception 'Owners cannot change their own role; transfer ownership first';
  end if;

  update public.household_members
  set role = p_new_role
  where household_id = p_household_id and user_id = p_member_user_id;

  if not found then
    raise exception 'Member not found in this household';
  end if;

  perform public.log_activity(p_household_id, 'member_role_changed', 'household_member', p_member_user_id,
    jsonb_build_object('new_role', p_new_role));
end;
$$;

create or replace function public.remove_household_member(
  p_household_id uuid,
  p_member_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_household_role(p_household_id, 'owner') then
    raise exception 'Only the household owner can remove members';
  end if;
  if p_member_user_id = auth.uid() then
    raise exception 'Use leave_household to remove yourself';
  end if;

  delete from public.household_members
  where household_id = p_household_id and user_id = p_member_user_id;

  if not found then
    raise exception 'Member not found in this household';
  end if;

  perform public.log_activity(p_household_id, 'member_removed', 'household_member', p_member_user_id, '{}'::jsonb);
end;
$$;

create or replace function public.leave_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.has_household_role(p_household_id, 'owner') then
    raise exception 'Transfer ownership before leaving this household';
  end if;

  delete from public.household_members
  where household_id = p_household_id and user_id = auth.uid();

  if not found then
    raise exception 'You are not a member of this household';
  end if;

  update public.profiles
  set default_household_id = null
  where id = auth.uid() and default_household_id = p_household_id;

  perform public.log_activity(p_household_id, 'member_left', 'household_member', auth.uid(), '{}'::jsonb);
end;
$$;

create or replace function public.transfer_household_ownership(
  p_household_id uuid,
  p_new_owner_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_household_role(p_household_id, 'owner') then
    raise exception 'Only the current owner can transfer ownership';
  end if;
  if not exists (
    select 1 from public.household_members
    where household_id = p_household_id and user_id = p_new_owner_user_id
  ) then
    raise exception 'The new owner must already be a member of this household';
  end if;
  if p_new_owner_user_id = auth.uid() then
    raise exception 'You are already the owner';
  end if;

  update public.household_members set role = 'owner'
  where household_id = p_household_id and user_id = p_new_owner_user_id;

  update public.household_members set role = 'editor'
  where household_id = p_household_id and user_id = auth.uid();

  update public.households set owner_id = p_new_owner_user_id where id = p_household_id;

  perform public.log_activity(p_household_id, 'ownership_transferred', 'household', p_household_id,
    jsonb_build_object('new_owner', p_new_owner_user_id));
end;
$$;

create or replace function public.archive_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_household_role(p_household_id, 'owner') then
    raise exception 'Only the household owner can delete this household';
  end if;

  update public.households
  set archived_at = coalesce(archived_at, now()), deleted_at = now()
  where id = p_household_id;

  perform public.log_activity(p_household_id, 'household_deleted', 'household', p_household_id,
    jsonb_build_object('recovery_window_days', 30));
end;
$$;

create or replace function public.restore_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_household_role(p_household_id, 'owner') then
    raise exception 'Only the household owner can restore this household';
  end if;

  update public.households
  set deleted_at = null, archived_at = null
  where id = p_household_id and deleted_at > now() - interval '30 days';

  if not found then
    raise exception 'This household cannot be restored (not found or past the 30-day recovery window)';
  end if;

  perform public.log_activity(p_household_id, 'household_restored', 'household', p_household_id, '{}'::jsonb);
end;
$$;
