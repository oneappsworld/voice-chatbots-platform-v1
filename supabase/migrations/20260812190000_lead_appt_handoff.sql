-- Backing tables for three new bot skills: Lead Qualification, Appointment
-- Booking, and Human Handoff & Escalation. Unlike calls/orders (seeded demo
-- data, select-only RLS), these are written live by the signed-in user as
-- they run each bot, so each table needs an insert policy too.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text,
  email text,
  company text,
  team_size text,
  use_case text,
  budget_range text,
  timeline text,
  score int not null default 0,
  qualification text not null check (qualification in ('qualified', 'nurture', 'disqualified')),
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Users can view their own leads"
  on public.leads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own leads"
  on public.leads for insert
  with check (auth.uid() = user_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service text not null,
  customer_name text,
  contact text,
  scheduled_at timestamptz not null,
  status text not null check (status in ('booked', 'cancelled')) default 'booked',
  created_at timestamptz not null default now()
);

create index appointments_user_scheduled_idx on public.appointments (user_id, scheduled_at);

alter table public.appointments enable row level security;

create policy "Users can view their own appointments"
  on public.appointments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own appointments"
  on public.appointments for insert
  with check (auth.uid() = user_id);

create table public.handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_bot text not null,
  reason text not null,
  context_summary text not null,
  transcript jsonb not null default '[]'::jsonb,
  assigned_agent text not null,
  status text not null check (status in ('pending', 'connected')) default 'connected',
  created_at timestamptz not null default now()
);

create index handoffs_user_created_idx on public.handoffs (user_id, created_at desc);

alter table public.handoffs enable row level security;

create policy "Users can view their own handoffs"
  on public.handoffs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own handoffs"
  on public.handoffs for insert
  with check (auth.uid() = user_id);
