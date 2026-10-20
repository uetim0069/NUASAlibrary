-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Adds the tables behind "Report an error" and the weekly Leaderboard in CBT practice.

create table if not exists public.cbt_reports (
  id bigserial primary key,
  course_code text,
  question text,
  note text,
  user_id uuid,
  created_at timestamptz not null default now()
);
alter table public.cbt_reports enable row level security;
drop policy if exists "anyone can report" on public.cbt_reports;
create policy "anyone can report" on public.cbt_reports for insert to anon, authenticated with check (true);
drop policy if exists "nuasa admin all" on public.cbt_reports;
create policy "nuasa admin all" on public.cbt_reports for all to authenticated using (public.nuasa_is_admin()) with check (public.nuasa_is_admin());

create table if not exists public.cbt_scores (
  id bigserial primary key,
  user_id uuid not null,
  name text,
  course_code text,
  mode text,
  pct int,
  correct int,
  total int,
  seconds int,
  created_at timestamptz not null default now()
);
create index if not exists cbt_scores_time on public.cbt_scores (created_at desc);
alter table public.cbt_scores enable row level security;
drop policy if exists "scores readable" on public.cbt_scores;
create policy "scores readable" on public.cbt_scores for select to anon, authenticated using (true);
drop policy if exists "own scores insert" on public.cbt_scores;
create policy "own scores insert" on public.cbt_scores for insert to authenticated with check (user_id = auth.uid());

-- ===== Update 2: video explanations, discussions, challenges =====
alter table public.cbt_questions add column if not exists video_url text;

create table if not exists public.cbt_comments (
  id bigserial primary key,
  question_id text not null,
  user_id uuid not null,
  name text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists cbt_comments_q on public.cbt_comments (question_id, created_at);
alter table public.cbt_comments enable row level security;
drop policy if exists "comments readable" on public.cbt_comments;
create policy "comments readable" on public.cbt_comments for select to anon, authenticated using (true);
drop policy if exists "comments insert own" on public.cbt_comments;
create policy "comments insert own" on public.cbt_comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "comments delete own" on public.cbt_comments;
create policy "comments delete own" on public.cbt_comments for delete to authenticated using (user_id = auth.uid());
drop policy if exists "nuasa admin all" on public.cbt_comments;
create policy "nuasa admin all" on public.cbt_comments for all to authenticated using (public.nuasa_is_admin()) with check (public.nuasa_is_admin());

create table if not exists public.cbt_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  creator_name text,
  course_code text,
  qids jsonb not null,
  pct int, correct int, total int, seconds int,
  created_at timestamptz not null default now()
);
alter table public.cbt_challenges enable row level security;
drop policy if exists "challenges readable" on public.cbt_challenges;
create policy "challenges readable" on public.cbt_challenges for select to anon, authenticated using (true);
drop policy if exists "challenges insert own" on public.cbt_challenges;
create policy "challenges insert own" on public.cbt_challenges for insert to authenticated with check (creator_id = auth.uid());

create table if not exists public.cbt_challenge_entries (
  id bigserial primary key,
  challenge_id uuid not null references public.cbt_challenges(id) on delete cascade,
  user_id uuid not null,
  name text,
  pct int, correct int, total int, seconds int,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
alter table public.cbt_challenge_entries enable row level security;
drop policy if exists "entries readable" on public.cbt_challenge_entries;
create policy "entries readable" on public.cbt_challenge_entries for select to anon, authenticated using (true);
drop policy if exists "entries insert own" on public.cbt_challenge_entries;
create policy "entries insert own" on public.cbt_challenge_entries for insert to authenticated with check (user_id = auth.uid());
