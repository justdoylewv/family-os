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
alter publication supabase_realtime add table notes;
