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
