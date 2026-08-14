-- Native in-house customer identity, replacing the external-Zendesk-only
-- "who is this caller" lookup with one built from data ChatSyn already
-- owns (leads + appointments both capture a real caller identity; calls
-- and orders currently don't — see project memory for why that's scoped
-- out of this pass). One row per distinct caller per org, matched by
-- email when known, else by phone.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text,
  phone text,
  name text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Partial unique indexes rather than a single composite unique: a caller
-- may be recorded by email only, phone only, or both, and matching should
-- key off whichever identifier is actually present.
create unique index customers_org_email_idx on public.customers (organization_id, lower(email)) where email is not null;
create unique index customers_org_phone_idx on public.customers (organization_id, phone) where phone is not null;
create index customers_org_last_seen_idx on public.customers (organization_id, last_seen_at desc);

alter table public.customers enable row level security;

-- Any active org member can read/write — this is populated by ordinary bot
-- usage (any teammate's lead/appointment), not an admin-only configuration
-- surface, so it follows the is_org_member policy shape rather than
-- is_org_admin (contrast with org_settings/bot_responses above).
create policy "Org members can view customers"
  on public.customers for select
  using (public.is_org_member(organization_id));

create policy "Org members can insert customers"
  on public.customers for insert
  with check (public.is_org_member(organization_id));

create policy "Org members can update customers"
  on public.customers for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
