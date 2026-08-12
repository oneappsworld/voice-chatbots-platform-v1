-- The team-invite flow needs to check whether an invited email already has
-- an account (so it can reject with a clear error instead of creating a
-- permanently-stuck invite that can never auto-link). `profiles` RLS only
-- lets a user read their own row, so a plain SELECT from the admin's
-- session always returns nothing regardless of the answer. This function
-- returns only a boolean — never the matched profile's data — so it's safe
-- to expose to any authenticated caller.
create or replace function public.email_has_account(check_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where lower(email) = lower(check_email)
  );
$$;
