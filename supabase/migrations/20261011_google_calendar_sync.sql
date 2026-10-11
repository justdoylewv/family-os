-- Google Calendar two-way sync. Run once in the Supabase SQL editor.

-- Times, locations and multi-day events from Google.
alter table events add column if not exists start_at timestamptz;
alter table events add column if not exists end_at timestamptz;
alter table events add column if not exists end_date date;
alter table events add column if not exists all_day boolean not null default true;
alter table events add column if not exists location text not null default '';

-- Sync upserts by Google's event id, which needs a plain (non-partial) unique index.
-- NULLs stay allowed for events that only live in the app.
drop index if exists events_google_event_id_idx;
create unique index if not exists events_google_event_id_key on events (google_event_id);

-- The family's Google connection. RLS is on with no policies, so only the server
-- (service role) can read the refresh token; the browser never sees it.
create table if not exists google_connection (
  id text primary key default 'family',
  refresh_token text,
  calendar_id text,
  calendar_name text,
  time_zone text,
  oauth_state text,
  oauth_state_expires timestamptz,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table google_connection enable row level security;
