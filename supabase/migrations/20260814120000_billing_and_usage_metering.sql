-- Stripe billing (Starter/Pro) + call-volume usage metering. Existing
-- accounts (including all QA/test accounts created before this migration)
-- must keep full access, so plan defaults to 'pro' and subscription_status
-- defaults to 'active' — nobody loses access on deploy.

alter table public.organizations
  add column plan text not null default 'pro' check (plan in ('starter', 'pro')),
  add column trial_ends_at timestamptz,
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column subscription_status text not null default 'active'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled'));

create unique index organizations_stripe_customer_id_idx
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

-- One row per organization per calendar month. "One call" is defined as
-- one fresh bot conversation (first turn / mount), not per-turn — see
-- startBotSession() in app/bots/actions.ts.
create table public.usage_counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_start date not null,
  call_count integer not null default 0,
  primary key (organization_id, period_start)
);

alter table public.usage_counters enable row level security;

create policy "Org members can view their usage"
  on public.usage_counters for select
  using (public.is_org_member(organization_id));

-- SECURITY DEFINER so the increment can upsert regardless of the caller's
-- own row-level permissions on usage_counters (same pattern as
-- is_org_member/is_org_admin — see reference_supabase_rls_recursion_gotcha
-- in project memory). Returns the new count so the caller can compare
-- against the plan's cap in one round trip.
create or replace function public.increment_call_usage(p_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', now())::date;
  v_count integer;
begin
  insert into public.usage_counters (organization_id, period_start, call_count)
  values (p_organization_id, v_period_start, 1)
  on conflict (organization_id, period_start)
    do update set call_count = usage_counters.call_count + 1
  returning call_count into v_count;

  return v_count;
end;
$$;
