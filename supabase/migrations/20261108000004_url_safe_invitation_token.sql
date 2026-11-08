-- create_invitation() generated raw tokens with encode(..., 'base64'), which
-- can contain '/' and '+' and trailing '='. Since the token is placed
-- directly into a /invite/[token] URL path segment, a '/' in the token
-- splits it into extra path segments and breaks the link. Switch to a
-- URL-safe alphabet (base64url, unpadded). The token is only ever hashed
-- and compared, never decoded, so any opaque URL-safe string works.

create or replace function public.create_invitation(
  p_household_id uuid,
  p_email text,
  p_role household_role
) returns table (invitation_id uuid, raw_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
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

  v_token := rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.household_invitations (household_id, email, role, token_hash, invited_by, expires_at)
  values (p_household_id, lower(p_email), p_role, v_hash, auth.uid(), v_expires)
  returning id into v_id;

  perform public.log_activity(p_household_id, 'member_invited', 'household_invitation', v_id,
    jsonb_build_object('email', lower(p_email), 'role', p_role));

  return query select v_id, v_token, v_expires;
end;
$$;
