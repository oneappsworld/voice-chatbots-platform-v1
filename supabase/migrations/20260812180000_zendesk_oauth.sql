-- Zendesk switched to OAuth-only for new accounts (API tokens can no longer
-- be created for accounts created on/after 2026-07-28). Move crm_connections
-- from static email/token auth to OAuth access/refresh tokens.

alter table public.crm_connections
  alter column agent_email drop not null,
  alter column api_token drop not null,
  add column access_token text,
  add column refresh_token text,
  add column token_expires_at timestamptz;
