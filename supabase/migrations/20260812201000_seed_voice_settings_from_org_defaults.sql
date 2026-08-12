-- Without this, org_settings.default_language/default_voice_style (set from
-- the Admin Settings panel) would be pure decoration — voice_settings has
-- its own hardcoded column defaults ('en-US'/'professional'), so a new
-- teammate joining an org would never actually see the org's configured
-- defaults. Redefines handle_new_user to seed voice_settings from the
-- (possibly just-created) org's settings instead of the column defaults.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_pending record;
  v_default_language text;
  v_default_style text;
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

  select default_language, default_voice_style into v_default_language, v_default_style
  from public.org_settings where organization_id = v_org_id;

  insert into public.voice_settings (user_id, language, style)
  values (new.id, coalesce(v_default_language, 'en-US'), coalesce(v_default_style, 'professional'));

  perform public.seed_demo_calls(new.id);
  perform public.seed_demo_orders(new.id);

  return new;
end;
$$;
