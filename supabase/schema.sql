-- Run this in Supabase → SQL Editor
-- Enables fuzzy matching extensions
create extension if not exists pg_trgm;
create extension if not exists fuzzystrmatch;

-- 1. Daily search limit per visitor (IP)
create table if not exists public.search_quota (
  key   text not null,
  day   date not null default current_date,
  count int  not null default 0,
  primary key (key, day)
);

-- 2. Saved songs/albums, per browser (anonymous device id cookie)
create table if not exists public.saved_items (
  device_id  text not null,
  item_key   text not null,
  item       jsonb not null,
  created_at timestamptz not null default now(),
  primary key (device_id, item_key)
);
create index if not exists saved_items_device_idx on public.saved_items (device_id, created_at desc);

-- 3. Search results cache (saves calls to the music API, kept 24h)
create table if not exists public.search_cache (
  key        text primary key,
  results    jsonb not null,
  created_at timestamptz not null default now()
);

-- 4. Layer 3: Own Song Catalog in Supabase
-- Populates automatically every time songs are searched and found
create table if not exists public.songs (
  key              text primary key, -- e.g. "song-123456"
  isrc             text,
  title            text not null,
  artist           text not null,
  album            text,
  cover            text,
  preview          text,
  year             text,
  explicit         boolean default false,
  sound_key        text not null,    -- Layer 1 phonetic key
  artist_sound_key text,
  rank             int default 0,
  copy_count       int default 0,    -- Layer 6 user popularity counter
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists songs_isrc_idx on public.songs (isrc);
create index if not exists songs_sound_key_idx on public.songs (sound_key);
create index if not exists songs_artist_sound_key_idx on public.songs (artist_sound_key);
create index if not exists songs_copy_count_idx on public.songs (copy_count desc);
-- Trigram similarity index for fast fuzzy matching
create index if not exists songs_title_trgm_idx on public.songs using gin (title gin_trgm_ops);
create index if not exists songs_artist_trgm_idx on public.songs using gin (artist gin_trgm_ops);

-- 5. Layer 6: User Learned Corrections & Queries
-- Tracks when users search for a query and then copy a song
create table if not exists public.search_corrections (
  query        text not null,
  target_isrc  text not null,
  sound_key    text not null,
  target_title text not null,
  target_artist text not null,
  copy_count   int not null default 1,
  last_copied  timestamptz not null default now(),
  primary key (query, target_isrc)
);

create index if not exists search_corrections_sound_key_idx on public.search_corrections (sound_key);
create index if not exists search_corrections_query_idx on public.search_corrections (query);

-- Function to record a copy event atomically
create or replace function public.record_song_copy(
  p_query text,
  p_sound_key text,
  p_isrc text,
  p_title text,
  p_artist text,
  p_item_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Increment copy_count in songs table if present
  update public.songs
  set copy_count = copy_count + 1,
      updated_at = now()
  where key = p_item_key or (isrc is not null and isrc = p_isrc);

  -- 2. Upsert learned search correction
  if p_query is not null and p_query <> '' and p_isrc is not null and p_isrc <> '' then
    insert into public.search_corrections (query, target_isrc, sound_key, target_title, target_artist, copy_count, last_copied)
    values (lower(trim(p_query)), p_isrc, p_sound_key, p_title, p_artist, 1, now())
    on conflict (query, target_isrc) do update
      set copy_count = search_corrections.copy_count + 1,
          last_copied = now();
  end if;
end;
$$;

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

-- Security / RLS policies
alter table public.search_quota enable row level security;
alter table public.saved_items  enable row level security;
alter table public.search_cache enable row level security;
alter table public.songs        enable row level security;
alter table public.search_corrections enable row level security;

revoke execute on function public.consume_search(text, int) from public, anon, authenticated;
revoke execute on function public.record_song_copy(text, text, text, text, text, text) from public, anon, authenticated;
