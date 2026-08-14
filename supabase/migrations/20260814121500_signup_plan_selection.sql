-- Wires the pricing page's plan choice into signup: SignupForm passes
-- selected_plan ('starter' | 'pro') via supabase.auth.signUp options.data,
-- landing in new.raw_user_meta_data. Brand-new organizations (not invited
-- members joining an existing one) now start on a real 14-day trial of the
-- chosen plan instead of relying on the column default — the 'pro'/'active'
-- column defaults from the previous migration remain in place and now only
-- serve their original purpose: preserving every pre-existing account's
-- access untouched.
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

  return new;
end;
$$;
