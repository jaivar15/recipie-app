-- Lets an unauthenticated or just-signed-in visitor preview an invitation
-- (household name, role, inviter, expiry) from its raw token before they
-- decide to accept or decline. No RLS bypass risk: only returns rows for a
-- token the caller already possesses, and never includes the token itself.

create or replace function public.get_invitation_preview(p_token text)
returns table (
  household_name text,
  role household_role,
  status invitation_status,
  expires_at timestamptz,
  invited_by_name text,
  invitee_email text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    h.name,
    i.role,
    i.status,
    i.expires_at,
    p.display_name,
    i.email
  from public.household_invitations i
  join public.households h on h.id = i.household_id
  join public.profiles p on p.id = i.invited_by
  where i.token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;
