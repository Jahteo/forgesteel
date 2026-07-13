-- ForgeSteel Supabase Schema
-- Run this in your Supabase project's SQL editor.
--
-- Prerequisites: Supabase Auth must be enabled (it is by default).

-- User profiles (display name, cursor color for tactical map presence)
create table if not exists user_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_color text default '#4a9eff'
);

-- Heroes scoped to a user
create table if not exists heroes (
  id         text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- Sourcebooks scoped to a user
create table if not exists sourcebooks (
  id         text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- Campaigns (permanent room, owned by director)
create table if not exists campaigns (
  id               uuid primary key default gen_random_uuid(),
  room_code        text unique not null,
  director_user_id uuid not null references auth.users(id),
  name             text not null,
  description      text default '',
  created_at       timestamptz default now()
);

-- Players permanently enrolled in a campaign
create table if not exists campaign_players (
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  hero_id      text not null,
  display_name text default '',
  joined_at    timestamptz default now(),
  primary key (campaign_id, user_id)
);

-- Director session state per campaign
create table if not exists sessions (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz default now()
);

-- Timestamped backups (for revert-on-override)
-- Schedule cleanup of expired rows via pg_cron or a Supabase Edge Function:
--   delete from backups where expires_at < now();
create table if not exists backups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  data_type  text not null check (data_type in ('hero', 'sourcebook', 'session')),
  data_id    text not null,
  data       jsonb not null,
  label      text default '',
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '14 days'
);

-- Hidden sourcebook IDs (mirrors local storage)
create table if not exists hidden_sourcebook_ids (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ids     jsonb not null default '[]'
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table user_profiles enable row level security;
create policy "users own their profile"
  on user_profiles for all using (auth.uid() = user_id);

alter table heroes enable row level security;
create policy "users own their heroes"
  on heroes for all using (auth.uid() = user_id);

alter table sourcebooks enable row level security;
create policy "users own their sourcebooks"
  on sourcebooks for all using (auth.uid() = user_id);

alter table campaigns enable row level security;
create policy "directors own their campaigns"
  on campaigns for all using (auth.uid() = director_user_id);
create policy "players can read enrolled campaigns"
  on campaigns for select using (
    exists (
      select 1 from campaign_players cp
      where cp.campaign_id = campaigns.id and cp.user_id = auth.uid()
    )
  );

alter table campaign_players enable row level security;
create policy "players manage their own enrollment"
  on campaign_players for all using (auth.uid() = user_id);
create policy "directors read their campaign players"
  on campaign_players for select using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_players.campaign_id and c.director_user_id = auth.uid()
    )
  );

alter table sessions enable row level security;
create policy "directors write their session"
  on sessions for all using (
    exists (
      select 1 from campaigns c
      where c.id = sessions.campaign_id and c.director_user_id = auth.uid()
    )
  );
create policy "enrolled players read session"
  on sessions for select using (
    exists (
      select 1 from campaign_players cp
      where cp.campaign_id = sessions.campaign_id and cp.user_id = auth.uid()
    )
  );

alter table backups enable row level security;
create policy "users own their backups"
  on backups for all using (auth.uid() = user_id);

alter table hidden_sourcebook_ids enable row level security;
create policy "users own their hidden ids"
  on hidden_sourcebook_ids for all using (auth.uid() = user_id);

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable realtime for the sessions table (optional — broadcast is used instead)
-- alter publication supabase_realtime add table sessions;
