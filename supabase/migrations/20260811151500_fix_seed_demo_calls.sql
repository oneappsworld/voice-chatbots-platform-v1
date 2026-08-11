-- Fix: floor() doesn't accept an interval. Use plain integer date arithmetic
-- for the day-offset trend calculation instead.
create or replace function public.seed_demo_calls(p_user_id uuid)
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
  range_start date := current_date - 29;
  d date;
  calls_today int;
  i int;
  r float;
  outcome text;
begin
  for d in select generate_series(range_start, current_date, interval '1 day')::date loop
    -- Gentle upward trend over the month, plus day-to-day noise.
    calls_today := 16 + floor((d - range_start) * 0.5)::int + floor(random() * 14)::int;

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
