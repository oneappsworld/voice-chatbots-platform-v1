-- ElevenLabs voice cloning connection. One per user. API key never sent to
-- the client — only read server-side in Server Actions, same pattern as
-- crm_connections.
create table public.elevenlabs_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  api_key text not null,
  voice_id text,
  voice_name text,
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.elevenlabs_connections enable row level security;

create policy "Users can view their own ElevenLabs connection"
  on public.elevenlabs_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own ElevenLabs connection"
  on public.elevenlabs_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ElevenLabs connection"
  on public.elevenlabs_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ElevenLabs connection"
  on public.elevenlabs_connections for delete
  using (auth.uid() = user_id);

-- Storage: one bucket for the uploaded clone-source sample, one for cached
-- generated FAQ audio (keyed by voice + language + intent, so repeat FAQ
-- answers replay for free instead of re-billing ElevenLabs).
insert into storage.buckets (id, name, public)
values ('elevenlabs-samples', 'elevenlabs-samples', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('tts-cache', 'tts-cache', false)
on conflict (id) do nothing;

create policy "Users can manage their own voice sample"
  on storage.objects for all
  using (bucket_id = 'elevenlabs-samples' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'elevenlabs-samples' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can manage their own tts cache"
  on storage.objects for all
  using (bucket_id = 'tts-cache' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'tts-cache' and (storage.foldername(name))[1] = auth.uid()::text);
