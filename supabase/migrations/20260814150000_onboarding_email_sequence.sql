-- 5-email onboarding drip, seeded per-user at signup so scheduling doesn't
-- depend on any client-side code running to completion. handle_new_user
-- already inserts profiles/org/voice_settings/demo data for every new
-- signup (invited-teammate or brand-new-org, both real "new users" who
-- should get onboarded) — this migration redefines it once more to also
-- seed 5 onboarding_emails rows with their real send times, and a real
-- cron job (app/api/cron/send-onboarding-emails) does the actual sending.

create table public.onboarding_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sequence_step smallint not null check (sequence_step between 1 and 5),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  resend_message_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, sequence_step)
);

create index onboarding_emails_due_idx on public.onboarding_emails (scheduled_at) where status = 'pending';

alter table public.onboarding_emails enable row level security;

-- Read-only for the owning user (not surfaced in the UI yet, but every
-- other user-scoped table in this app carries an owner-select policy —
-- see reference_supabase_rls_recursion_gotcha for why this is a plain
-- policy, not a SECURITY DEFINER function: no self-referential subquery
-- here, auth.uid() = user_id is a direct comparison). All writes go
-- through handle_new_user (SECURITY DEFINER, bypasses RLS) or the cron
-- route (service-role client, bypasses RLS) — no insert/update policy for
-- regular users.
create policy "Users can view their own onboarding emails"
  on public.onboarding_emails for select
  using (auth.uid() = user_id);

alter table public.profiles add column onboarding_emails_unsubscribed boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_pending record;
  v_plan text := case
    when new.raw_user_meta_data ->> 'selected_plan' = 'pro' then 'pro'
    else 'starter'
  end;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  select * into v_pending
  from public.organization_members
  where lower(invited_email) = lower(new.email) and status = 'invited'
  limit 1;

  if v_pending.id is not null then
    v_org_id := v_pending.organization_id;
    update public.organization_members
      set user_id = new.id, status = 'active', joined_at = now()
      where id = v_pending.id;
  else
    insert into public.organizations (name, owner_user_id, plan, subscription_status, trial_ends_at)
    values (
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'My') || '''s Organization',
      new.id,
      v_plan,
      'trialing',
      now() + interval '14 days'
    )
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, invited_email, role, status, joined_at)
    values (v_org_id, new.id, new.email, 'owner', 'active', now());

    insert into public.org_settings (organization_id) values (v_org_id);
  end if;

  update public.profiles set organization_id = v_org_id where id = new.id;

  insert into public.voice_settings (user_id)
  values (new.id);

  perform public.seed_demo_calls(new.id);
  perform public.seed_demo_orders(new.id);

  insert into public.onboarding_emails (user_id, sequence_step, scheduled_at)
  values
    (new.id, 1, now()),
    (new.id, 2, now() + interval '2 days'),
    (new.id, 3, now() + interval '4 days'),
    (new.id, 4, now() + interval '7 days'),
    (new.id, 5, now() + interval '14 days');

  return new;
end;
$$;
