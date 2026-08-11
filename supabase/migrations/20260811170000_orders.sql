-- Orders backing the Order Status Check Bot. Sample data only (no real
-- e-commerce integration yet) — seeded per user on signup, same pattern as
-- the `calls` table.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_number text not null,
  item text not null,
  status text not null check (status in ('processing', 'shipped', 'in_transit', 'delivered', 'cancelled')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, order_number)
);

alter table public.orders enable row level security;

create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create function public.seed_demo_orders(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  items text[] := array[
    'Wireless Headphones', 'Standing Desk', 'Office Chair', 'USB-C Hub',
    'Laptop Stand', 'Desk Lamp', 'Ergonomic Mouse', 'Monitor Arm', 'Webcam', 'Keyboard'
  ];
  statuses text[] := array['processing', 'shipped', 'in_transit', 'delivered', 'delivered', 'cancelled'];
  i int;
  order_num text;
  days_ago int;
begin
  for i in 1..8 loop
    order_num := 'ORD-' || (10000 + floor(random() * 89999)::int)::text;
    days_ago := floor(random() * 14)::int;

    insert into public.orders (user_id, order_number, item, status, updated_at)
    values (
      p_user_id,
      order_num,
      items[1 + floor(random() * array_length(items, 1))::int],
      statuses[1 + floor(random() * array_length(statuses, 1))::int],
      now() - (days_ago::text || ' days')::interval
    )
    on conflict (user_id, order_number) do nothing;
  end loop;
end;
$$;

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

  insert into public.voice_settings (user_id)
  values (new.id);

  perform public.seed_demo_calls(new.id);
  perform public.seed_demo_orders(new.id);

  return new;
end;
$$;
