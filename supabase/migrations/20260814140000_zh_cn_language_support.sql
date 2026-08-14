-- Widens every language CHECK constraint to include zh-CN, part of the
-- Chinese-language support build for the real telephony product. Without
-- this, picking Chinese anywhere (voice settings, org default language,
-- bot response overrides) would be rejected at the DB layer even though
-- the app code now fully supports it.
alter table public.voice_settings drop constraint voice_settings_language_check;
alter table public.voice_settings add constraint voice_settings_language_check
  check (language in ('en-US', 'es-ES', 'zh-CN'));

alter table public.org_settings drop constraint org_settings_default_language_check;
alter table public.org_settings add constraint org_settings_default_language_check
  check (default_language in ('en-US', 'es-ES', 'zh-CN'));

alter table public.bot_responses drop constraint bot_responses_language_check;
alter table public.bot_responses add constraint bot_responses_language_check
  check (language in ('en-US', 'es-ES', 'zh-CN'));
