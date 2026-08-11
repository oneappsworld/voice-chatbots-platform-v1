-- Call records powering the dashboard analytics. Each row is one handled call,
-- scoped to the signed-in user via RLS.

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null,
  department text not null,
  topic text not null,
  outcome text not null check (outcome in ('resolved', 'escalated', 'missed')),
  duration_seconds int not null,
  created_at timestamptz not null default now()
);

create index calls_user_occurred_idx on public.calls (user_id, occurred_at desc);

alter table public.calls enable row level security;

create policy "Users can view their own calls"
  on public.calls for select
  using (auth.uid() = user_id);

-- Seeds ~30 days of realistic sample call activity for a new account so the
-- dashboard isn't empty on first login. This is clearly demo data (labeled as
-- such in the UI) until real voice-agent call ingestion replaces it.
create function public.seed_demo_calls(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  topics text[] := array[
    'Order status', 'Appointment scheduling', 'Billing question',
    'Password reset', 'Returns & refunds', 'Product availability',
    'Service outage', 'Account setup'
  ];
  departments text[] := array['Sales', 'Support', 'Internal Ops'];
  d date;
  calls_today int;
  i int;
  r float;
  outcome text;
begin
  for d in select generate_series(current_date - interval '29 days', current_date, interval '1 day')::date loop
    -- Gentle upward trend over the month, plus day-to-day noise.
    calls_today := 16 + floor((d - (current_date - interval '29 days')) * 0.5)::int + floor(random() * 14)::int;

    for i in 1..calls_today loop
      r := random();
      outcome := case
        when r < 0.78 then 'resolved'
        when r < 0.93 then 'escalated'
        else 'missed'
      end;

      insert into public.calls (user_id, occurred_at, department, topic, outcome, duration_seconds)
      values (
        p_user_id,
        d + (random() * interval '23 hours 59 minutes'),
        departments[1 + floor(random() * array_length(departments, 1))::int],
        topics[1 + floor(random() * array_length(topics, 1))::int],
        outcome,
        45 + floor(random() * 280)::int
      );
    end loop;
  end loop;
end;
$$;

-- Extend the existing sign-up trigger to also seed sample call data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  perform public.seed_demo_calls(new.id);

  return new;
end;
$$;
