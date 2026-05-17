-- Family OS — Supabase schema
-- Apply via the Supabase SQL editor, or `supabase db push` if using the CLI.

create extension if not exists "pgcrypto";

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points integer not null default 0,
  avatar_color text not null default 'bg-blue-500',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  category text not null default 'family',
  assigned_to_member_id uuid references members(id) on delete set null,
  google_event_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists events_google_event_id_idx
  on events (google_event_id) where google_event_id is not null;

create table if not exists groceries (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  aisle text not null default 'Other',
  created_at timestamptz not null default now()
);

create table if not exists chores (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  assigned_to_member_id uuid references members(id) on delete set null,
  points integer not null default 10,
  due_date date,
  recurrence text not null default 'none',
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  points integer not null,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists meals (
  day text primary key,
  lunch text not null default '',
  dinner text not null default ''
);

create table if not exists settings (
  key text primary key,
  value text not null default ''
);

create table if not exists info_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Row-level security: lock every table to authenticated requests.
alter table members        enable row level security;
alter table events         enable row level security;
alter table groceries      enable row level security;
alter table chores         enable row level security;
alter table rewards        enable row level security;
alter table meals          enable row level security;
alter table settings       enable row level security;
alter table info_contacts  enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'members','events','groceries','chores','rewards','meals','settings','info_contacts'
  ]) loop
    execute format('drop policy if exists "family rw" on %I', t);
    execute format('create policy "family rw" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end$$;

-- Seed: the seven weekday rows so the meal planner has stable keys.
insert into meals (day) values
  ('Monday'),('Tuesday'),('Wednesday'),('Thursday'),('Friday'),('Saturday'),('Sunday')
on conflict (day) do nothing;

-- Realtime: publish change events so the kitchen/living-room tablets stay in sync.
alter publication supabase_realtime add table
  members, events, groceries, chores, rewards, meals, settings, info_contacts;
