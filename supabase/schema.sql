-- Run this once in Supabase → SQL Editor

-- Daily search limit per visitor (IP)
create table if not exists public.search_quota (
  key   text not null,
  day   date not null default current_date,
  count int  not null default 0,
  primary key (key, day)
);

-- Saved songs/albums, per browser (anonymous device id cookie)
create table if not exists public.saved_items (
  device_id  text not null,
  item_key   text not null,
  item       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (device_id, item_key)
);
create index if not exists saved_items_device_idx on public.saved_items (device_id, created_at desc);

-- Search results cache (saves calls to the music API, kept 24h)
create table if not exists public.search_cache (
  key        text primary key,
  results    jsonb not null,
  created_at timestamptz not null default now()
);

-- Uses one search atomically. Returns searches left, or -1 if the limit was already reached.
create or replace function public.consume_search(p_key text, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare c int;
begin
  insert into search_quota (key, day, count)
  values (p_key, current_date, 1)
  on conflict (key, day) do update
    set count = search_quota.count + 1
    where search_quota.count < p_limit
  returning count into c;

  if c is null then
    return -1;
  end if;
  return p_limit - c;
end;
$$;

-- Lock everything down: only the server (service_role key) can read/write.
alter table public.search_quota enable row level security;
alter table public.saved_items  enable row level security;
alter table public.search_cache enable row level security;
revoke execute on function public.consume_search(text, int) from public, anon, authenticated;

-- Optional clean-up you can schedule with pg_cron:
-- delete from search_quota where day < current_date - 7;
-- delete from search_cache where created_at < now() - interval '2 days';
