-- BIH test seed data (idempotent)
-- Purpose: populate sample Ghana-focused records for testing.
-- Includes:
--   - 4 projects (2 completed, 1 ongoing, 1 proposed)
--   - 5 media articles

begin;

alter table if exists public.media_articles
  add column if not exists full_story_url text;

with project_seed as (
  select * from (
    values
      (
        'Legon Community Digital Skills Bootcamp',
        'A practical digital skills program for tertiary students and youth in Accra, covering productivity tools, CV readiness, and interview preparation.',
        'Accra, Ghana',
        'ongoing'::public.project_status,
        array['University of Ghana', 'Bridge for Impact Hub']::text[],
        'Jan 2026 - Dec 2026',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80'
      ),
      (
        'Volta Rural STEM Clubs Expansion',
        'Set up after-school STEM clubs in selected Volta Region schools with facilitator training and low-cost science kits.',
        'Ho, Ghana',
        'proposed'::public.project_status,
        array['Regional Education Directorate', 'Bridge for Impact Hub']::text[],
        'Q3 2026 - Q2 2027',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80'
      ),
      (
        'Northern Girls in Coding Fellowship',
        'Completed fellowship that trained young women in foundational coding, teamwork, and innovation challenge pitching.',
        'Tamale, Ghana',
        'completed'::public.project_status,
        array['Tamale Youth Center', 'Bridge for Impact Hub']::text[],
        'Completed in 2025',
        'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900&q=80'
      ),
      (
        'Coastal Plastic Recovery Challenge',
        'Completed community clean-up and recycling activation project supporting youth-led waste sorting and awareness in coastal communities.',
        'Cape Coast, Ghana',
        'completed'::public.project_status,
        array['Cape Coast Assembly', 'Bridge for Impact Hub']::text[],
        'Completed in 2024',
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=900&q=80'
      )
  ) as seed(title, description, location, status, partners, timeline, image_url)
),
upsert_projects as (
  insert into public.projects (title, description, location, status, partners, timeline, image_url)
  select s.title, s.description, s.location, s.status, s.partners, s.timeline, s.image_url
  from project_seed s
  where not exists (
    select 1
    from public.projects p
    where p.title = s.title
  )
  returning id
)
update public.projects p
set
  description = s.description,
  location = s.location,
  status = s.status,
  partners = s.partners,
  timeline = s.timeline,
  image_url = s.image_url
from project_seed s
where p.title = s.title;

with media_seed as (
  select * from (
    values
      (
        'How Ghanaian Campuses Are Driving Community Innovation',
        'A look at student-led initiatives from Legon and beyond that are turning local ideas into measurable social impact.',
        'Across Ghanaian campuses, student innovation hubs are addressing real community needs through practical service projects. At Legon, teams combine mentoring, project planning clinics, and local partnerships to move ideas from concept to execution.\n\nThe strongest programs define a clear problem statement, build with community input early, and track outcomes over time. BIH uses these same principles to support consistent impact delivery.',
        'BIH Editorial Team',
        'Innovation',
        '2026-03-01'::date,
        '["https://source.unsplash.com/1600x900/?ghana,university,african,students","https://source.unsplash.com/1600x900/?ghana,classroom,youth,training","https://source.unsplash.com/1600x900/?ghana,education,teamwork,community"]',
        'https://example.org/stories/ghanaian-campuses-innovation'
      ),
      (
        'From Proposal to Impact: Community Projects in Ghana',
        'An inside view of how project suggestions move through review to become action-ready interventions.',
        'A project idea becomes impactful when it moves through structured review, planning, and delivery. BIH collects suggestions, validates feasibility, aligns partners, and defines implementation milestones before publication.\n\nTransparent decisions improve collaboration and delivery quality.',
        'Operations Desk',
        'Transparency',
        '2026-02-18'::date,
        'https://source.unsplash.com/1600x900/?ghana,community,meeting,africa',
        null
      ),
      (
        'Women-Led Tech Mentorship in West Africa',
        'Profiles of mentorship circles helping young women in Ghana and neighboring countries launch careers in digital fields.',
        'Women-led mentorship circles are improving access to digital careers by combining technical coaching with confidence-building and peer accountability.\n\nBIH tracks these initiatives as part of inclusive innovation programming.',
        'Regional Features',
        'Inclusion',
        '2026-02-10'::date,
        'https://source.unsplash.com/1600x900/?african,women,technology,mentorship',
        'https://example.org/stories/women-led-tech-mentorship'
      ),
      (
        'Youth Climate Action: Lessons from Coastal Ghana',
        'Community youth groups are combining clean-up drives and practical recycling education to reduce local waste pressure.',
        'Coastal communities in Ghana are increasingly led by youth climate groups that organize recurring clean-up operations and practical environmental education.\n\nLocal ownership and steady execution remain the strongest predictors of measurable impact.',
        'Community Desk',
        'Environment',
        '2026-01-29'::date,
        'https://source.unsplash.com/1600x900/?ghana,coast,environment,africa',
        null
      ),
      (
        'Building Trust Through Data in African Nonprofits',
        'How clear reporting and open dashboards improve donor confidence and strengthen collaboration outcomes.',
        'Trust in nonprofit work increases when data is consistent, easy to understand, and tied to outcomes.\n\nFor BIH, shared reporting helps volunteers, NGOs, and funders stay aligned on progress and trade-offs.',
        'BIH Research Unit',
        'Governance',
        '2026-01-16'::date,
        'https://source.unsplash.com/1600x900/?africa,nonprofit,data,teamwork',
        'https://example.org/stories/data-trust-african-nonprofits'
      )
  ) as seed(title, summary, content, author, category, published_at, image_url, full_story_url)
),
upsert_media as (
  insert into public.media_articles (title, summary, content, author, category, published_at, image_url, full_story_url)
  select s.title, s.summary, s.content, s.author, s.category, s.published_at, s.image_url, s.full_story_url
  from media_seed s
  where not exists (
    select 1
    from public.media_articles m
    where m.title = s.title
  )
  returning id
)
update public.media_articles m
set
  summary = s.summary,
  content = s.content,
  author = s.author,
  category = s.category,
  published_at = s.published_at,
  image_url = s.image_url,
  full_story_url = s.full_story_url
from media_seed s
where m.title = s.title;

commit;
