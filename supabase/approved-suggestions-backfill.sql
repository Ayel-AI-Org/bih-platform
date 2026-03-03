-- Run this once to create missing proposed projects for suggestions already marked approved.
-- Useful when approvals were done before the project RLS fix.

insert into public.projects (
  title,
  description,
  location,
  status,
  partners,
  timeline,
  image_url
)
select
  s.title,
  s.description,
  s.location,
  'proposed'::public.project_status,
  array['Pending BIH Assignment']::text[],
  s.timeline,
  'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900&q=80'
from public.project_suggestions s
where s.status = 'approved'
  and not exists (
    select 1
    from public.projects p
    where p.title = s.title
      and p.location = s.location
      and p.timeline = s.timeline
  );
