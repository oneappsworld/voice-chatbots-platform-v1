-- Admin Dashboard foundation: this app was single-tenant-per-user (every
-- table scoped to auth.uid()) with no concept of a "team" an admin could
-- manage. This introduces a lightweight organization layer so an admin can
-- invite teammates, assign roles, and see analytics/content across the
-- whole team — without touching the ownership or RLS of any existing table.
-- Every existing owner-scoped policy stays exactly as-is; org-wide access
-- is granted through NEW additive policies (Postgres ORs permissive
-- policies together), so there's zero regression risk to current behavior.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Null until the invited email actually signs up — see handle_new_user below.
  user_id uuid references auth.users (id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('owner', 'admin', 'agent', 'viewer')),
  status text not null check (status in ('invited', 'active')) default 'invited',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (organization_id, invited_email)
);

create index organization_members_org_idx on public.organization_members (organization_id);
create index organization_members_user_idx on public.organization_members (user_id);

alter table public.profiles add column organization_id uuid references public.organizations (id);

create table public.org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  default_language text not null default 'en-US' check (default_language in ('en-US', 'es-ES')),
  default_voice_style text not null default 'professional' check (default_voice_style in ('warm', 'professional', 'energetic')),
  business_name text,
  support_email text,
  -- How many consecutive unrecognized/failed turns before a bot escalates
  -- to a human — see checkEscalation() in lib/escalation.ts.
  escalation_sensitivity text not null default 'normal' check (escalation_sensitivity in ('low', 'normal', 'high')),
  updated_at timestamptz not null default now()
);

-- Org-level overrides for bot copy — the content moderation surface. Falls
-- back to the hardcoded defaults in lib/faq.ts when no row exists for a
-- given (language, intent) pair.
create table public.bot_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  language text not null check (language in ('en-US', 'es-ES')),
  intent text not null,
  response_text text not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  unique (organization_id, language, intent)
);

-- SECURITY DEFINER helpers: organization_members' own RLS needs to check
-- "is auth.uid() a member of this org", which would recurse if expressed as
-- a policy subquerying organization_members directly (see
-- reference_supabase_rls_recursion_gotcha in project memory). These
-- functions run with elevated privilege internally, bypassing RLS for the
-- membership check itself, so policies can call them safely.
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

-- Used by the additive analytics policies below: "is the caller an admin of
-- the org that target_user_id belongs to?"
create or replace function public.is_org_admin_of_user(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members admin_m
    join public.organization_members target_m
      on target_m.organization_id = admin_m.organization_id
    where admin_m.user_id = auth.uid()
      and admin_m.status = 'active'
      and admin_m.role in ('owner', 'admin')
      and target_m.user_id = target_user_id
      and target_m.status = 'active'
  );
$$;

alter table public.organizations enable row level security;

create policy "Members can view their organization"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Owner can update their organization"
  on public.organizations for update
  using (owner_user_id = auth.uid());

alter table public.organization_members enable row level security;

create policy "Members can view their org roster"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "Admins can invite members"
  on public.organization_members for insert
  with check (public.is_org_admin(organization_id) and role <> 'owner');

create policy "Admins can update member roles"
  on public.organization_members for update
  using (public.is_org_admin(organization_id) and role <> 'owner')
  with check (public.is_org_admin(organization_id) and role <> 'owner');

create policy "Admins can remove members"
  on public.organization_members for delete
  using (public.is_org_admin(organization_id) and role <> 'owner');

alter table public.org_settings enable row level security;

create policy "Org members can view settings"
  on public.org_settings for select
  using (public.is_org_member(organization_id));

create policy "Org admins can insert settings"
  on public.org_settings for insert
  with check (public.is_org_admin(organization_id));

create policy "Org admins can update settings"
  on public.org_settings for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

alter table public.bot_responses enable row level security;

create policy "Org members can view bot responses"
  on public.bot_responses for select
  using (public.is_org_member(organization_id));

create policy "Org admins can insert bot responses"
  on public.bot_responses for insert
  with check (public.is_org_admin(organization_id));

create policy "Org admins can update bot responses"
  on public.bot_responses for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "Org admins can delete bot responses"
  on public.bot_responses for delete
  using (public.is_org_admin(organization_id));

-- Additive: lets an org admin's "aggregated analytics from all bots" view
-- see every team member's activity, not just their own. Existing
-- owner-only select policies on these tables are untouched — Postgres ORs
-- multiple permissive policies together, so this only ever adds access.
create policy "Org admins can view all member calls"
  on public.calls for select
  using (public.is_org_admin_of_user(user_id));

create policy "Org admins can view all member orders"
  on public.orders for select
  using (public.is_org_admin_of_user(user_id));

create policy "Org admins can view all member leads"
  on public.leads for select
  using (public.is_org_admin_of_user(user_id));

create policy "Org admins can view all member appointments"
  on public.appointments for select
  using (public.is_org_admin_of_user(user_id));

create policy "Org admins can view all member handoffs"
  on public.handoffs for select
  using (public.is_org_admin_of_user(user_id));

-- Extends handle_new_user (previously: profiles + voice_settings + demo
-- seeding) to also provision organization membership: if this email was
-- already invited to an org, join it; otherwise create a new org and become
-- its owner — exactly the account-per-signup behavior every user already
-- had, just now formalized as "owns a one-person org" instead of implicit.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_pending record;
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
    insert into public.organizations (name, owner_user_id)
    values (coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'My') || '''s Organization', new.id)
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

  return new;
end;
$$;

-- Backfill: every account created before this migration gets its own
-- organization too, matching what handle_new_user now does for new signups.
do $$
declare
  r record;
  v_org_id uuid;
begin
  for r in select id, email, full_name from public.profiles where organization_id is null loop
    insert into public.organizations (name, owner_user_id)
    values (coalesce(r.full_name, r.email, 'My') || '''s Organization', r.id)
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, invited_email, role, status, joined_at)
    values (v_org_id, r.id, r.email, 'owner', 'active', now());

    insert into public.org_settings (organization_id) values (v_org_id);

    update public.profiles set organization_id = v_org_id where id = r.id;
  end loop;
end $$;
