-- The pgcrypto extension (digest, gen_random_bytes) lives in the
-- `extensions` schema on Supabase-hosted projects, not `public`. The
-- SECURITY DEFINER functions below were created with
-- `set search_path = public` and call digest()/gen_random_bytes(), which
-- fails at call time with "function ... does not exist". Add `extensions`
-- to their search_path.

alter function public.create_invitation(uuid, text, household_role)
  set search_path = public, extensions;

alter function public.accept_invitation(text)
  set search_path = public, extensions;

alter function public.decline_invitation(text)
  set search_path = public, extensions;
