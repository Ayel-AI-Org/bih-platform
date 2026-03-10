-- Run this once on existing databases to support detailed media/article views.
alter table if exists public.media_articles
  add column if not exists content text,
  add column if not exists full_story_url text;

update public.media_articles
set content = summary
where content is null or trim(content) = '';

alter table public.media_articles
  alter column content set not null;
