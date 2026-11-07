-- Run this once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Real student ratings for the masterclass pages. One rating per student per course (they can edit it).

create table if not exists public.course_reviews (
  id bigserial primary key,
  course text not null,                       -- the course's playlist key used in index.html
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (course, user_id)
);

alter table public.course_reviews enable row level security;

drop policy if exists "reviews are public" on public.course_reviews;
create policy "reviews are public" on public.course_reviews for select using (true);

drop policy if exists "students add own review" on public.course_reviews;
create policy "students add own review" on public.course_reviews for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "students edit own review" on public.course_reviews;
create policy "students edit own review" on public.course_reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "students delete own review" on public.course_reviews;
create policy "students delete own review" on public.course_reviews for delete to authenticated using (auth.uid() = user_id);
-- To remove an unwanted review yourself: Table Editor > course_reviews > delete the row.
