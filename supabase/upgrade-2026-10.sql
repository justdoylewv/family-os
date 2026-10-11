-- Family OS upgrade (October 2026). Paste this whole file into Supabase → SQL editor → Run.
-- Safe to run more than once.

-- ===== 20261011_google_calendar_sync =====
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

-- ===== 20261011_message_board =====
-- Message board (sticky notes + doodles). Run once in the Supabase SQL editor.
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note',          -- 'note' or 'doodle'
  text text not null default '',
  color text not null default 'yellow',
  image text,                                  -- PNG data URL for doodles
  member_id uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table notes enable row level security;
drop policy if exists "family rw" on notes;
create policy "family rw" on notes for all to authenticated using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notes') then
    alter publication supabase_realtime add table notes;
  end if;
end $$;

-- ===== 20261011_bills =====
-- Bills & subscriptions register. Run once in the Supabase SQL editor.
create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(10,2) not null default 0,
  cadence text not null default 'monthly',     -- weekly | monthly | quarterly | yearly
  anchor_date date not null,                   -- any past or upcoming due date; later ones repeat from it
  autopay boolean not null default false,
  pay_from text not null default '',           -- e.g. "Chase card ending 1234" (never full numbers)
  category text not null default 'Other',
  account_email text not null default '',      -- which email the account is under
  website text not null default '',
  notes text not null default '',
  last_paid date,                              -- for bills that aren't on autopay
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table bills enable row level security;
drop policy if exists "family rw" on bills;
create policy "family rw" on bills for all to authenticated using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bills') then
    alter publication supabase_realtime add table bills;
  end if;
end $$;
