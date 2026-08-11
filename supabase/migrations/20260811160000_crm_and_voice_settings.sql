-- CRM/Helpdesk connection (Zendesk). One connection per user. The API token
-- is never exposed to client code — only read server-side via Server Actions
-- running with the user's own session, respecting RLS below.
create table public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  provider text not null default 'zendesk' check (provider in ('zendesk')),
  subdomain text not null,
  agent_email text not null,
  api_token text not null,
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  connected_agent_name text,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_connections enable row level security;

create policy "Users can view their own CRM connection"
  on public.crm_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own CRM connection"
  on public.crm_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own CRM connection"
  on public.crm_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete their own CRM connection"
  on public.crm_connections for delete
  using (auth.uid() = user_id);

-- Voice / persona settings for the TTS preview.
create table public.voice_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  persona_name text not null default 'Ava',
  greeting text not null default 'Hi, thanks for calling — how can I help you today?',
  language text not null default 'en-US' check (language in ('en-US', 'es-ES')),
  style text not null default 'professional' check (style in ('warm', 'professional', 'energetic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_settings enable row level security;

create policy "Users can view their own voice settings"
  on public.voice_settings for select
  using (auth.uid() = user_id);

create policy "Users can update their own voice settings"
  on public.voice_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert their own voice settings"
  on public.voice_settings for insert
  with check (auth.uid() = user_id);

-- Extend the sign-up trigger to seed default voice settings alongside the
-- profile and demo call data.
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

  return new;
end;
$$;
