-- Run this once on existing Supabase projects to allow admin-created projects.
-- This fixes: "violates row level security policy for table projects"

drop policy if exists "admin insert projects" on public.projects;
drop policy if exists "admin update projects" on public.projects;
drop policy if exists "admin delete projects" on public.projects;

create policy "admin insert projects" on public.projects
for insert
with check (public.is_admin());

create policy "admin update projects" on public.projects
for update
using (public.is_admin());

create policy "admin delete projects" on public.projects
for delete
using (public.is_admin());
