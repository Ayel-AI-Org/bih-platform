-- BIH test seed data (idempotent)
-- Purpose: populate sample Ghana-focused records for testing.
-- Includes:
--   - 5 approved volunteers (profiles & volunteer_profiles)
--   - 4 approved NGOs (profiles & ngo_profiles)
--   - 13 projects (varying statuses: ongoing, proposed, completed)
--   - 10 media articles (varying topics: technology, education, environment, health, forestry)

begin;

alter table if exists public.media_articles
  add column if not exists full_story_url text;

-- 1. SEED AUTH USERS & PROFILES FOR 5 APPROVED VOLUNTEERS
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'volunteer1@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kofi Mensah","role":"volunteer"}', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'volunteer2@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ama Serwaa","role":"volunteer"}', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'volunteer3@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kwame Owusu","role":"volunteer"}', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'volunteer4@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Esi Ansah","role":"volunteer"}', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000005', 'volunteer5@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Yaw Boateng","role":"volunteer"}', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', 'volunteer'::public.user_role, 'Kofi Mensah', 'volunteer1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'volunteer'::public.user_role, 'Ama Serwaa', 'volunteer2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000003', 'volunteer'::public.user_role, 'Kwame Owusu', 'volunteer3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'volunteer'::public.user_role, 'Esi Ansah', 'volunteer4@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000005', 'volunteer'::public.user_role, 'Yaw Boateng', 'volunteer5@example.com', now(), now())
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email;

insert into public.volunteer_profiles (user_id, phone, location, skills, availability, approval_status, total_verified_hours, badge_level)
values
  ('00000000-0000-0000-0000-000000000001', '+233201234567', 'Accra, Greater Accra', array['Coding', 'Teaching']::text[], 'Weekends', 'approved'::public.approval_status, 15, 'bronze'),
  ('00000000-0000-0000-0000-000000000002', '+233241234568', 'Kumasi, Ashanti', array['Marketing', 'Event Planning']::text[], 'Evenings', 'approved'::public.approval_status, 55, 'silver'),
  ('00000000-0000-0000-0000-000000000003', '+233271234569', 'Tamale, Northern', array['Mentorship', 'STEM']::text[], 'Flexible', 'approved'::public.approval_status, 110, 'gold'),
  ('00000000-0000-0000-0000-000000000004', '+233281234570', 'Cape Coast, Central', array['Public Speaking', 'Writing']::text[], 'Weekdays', 'approved'::public.approval_status, 5, 'newcomer'),
  ('00000000-0000-0000-0000-000000000005', '+233291234571', 'Takoradi, Western', array['Data Analysis', 'Web Dev']::text[], 'Weekends', 'approved'::public.approval_status, 0, 'newcomer')
on conflict (user_id) do update set
  phone = excluded.phone,
  location = excluded.location,
  skills = excluded.skills,
  availability = excluded.availability,
  approval_status = excluded.approval_status;


-- 2. SEED AUTH USERS & PROFILES FOR 4 APPROVED NGOS
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000011', 'ngo1@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ghana Education Aid","role":"ngo"}', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000012', 'ngo2@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Green Ghana Initiative","role":"ngo"}', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000013', 'ngo3@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Health for All Foundation","role":"ngo"}', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000014', 'ngo4@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tech Empowerment Network","role":"ngo"}', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000011', 'ngo'::public.user_role, 'Ghana Education Aid', 'ngo1@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000012', 'ngo'::public.user_role, 'Green Ghana Initiative', 'ngo2@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000013', 'ngo'::public.user_role, 'Health for All Foundation', 'ngo3@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000014', 'ngo'::public.user_role, 'Tech Empowerment Network', 'ngo4@example.com', now(), now())
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email;

insert into public.ngo_profiles (user_id, organization_name, contact_person, phone, focus_area, registration_number, approval_status)
values
  ('00000000-0000-0000-0000-000000000011', 'Ghana Education Aid', 'Kwadwo Adjei', '+233209876543', 'Education funding and support in rural areas', 'NGO-ED-2026-98', 'approved'::public.approval_status),
  ('00000000-0000-0000-0000-000000000012', 'Green Ghana Initiative', 'Abena Pokua', '+233249876544', 'Afforestation and sanitation challenges', 'NGO-EN-2026-44', 'approved'::public.approval_status),
  ('00000000-0000-0000-0000-000000000013', 'Health for All Foundation', 'Dr. Seth Appiah', '+233279876545', 'Primary healthcare access in coastal towns', 'NGO-HE-2026-05', 'approved'::public.approval_status),
  ('00000000-0000-0000-0000-000000000014', 'Tech Empowerment Network', 'Linda Osei', '+233289876546', 'Digital skills and computer literacy training', 'NGO-TE-2026-11', 'approved'::public.approval_status)
on conflict (user_id) do update set
  organization_name = excluded.organization_name,
  contact_person = excluded.contact_person,
  phone = excluded.phone,
  focus_area = excluded.focus_area,
  registration_number = excluded.registration_number,
  approval_status = excluded.approval_status;


-- 3. SEED 13 PROJECTS DYNAMICALLY LINKED TO ACTIVE NGOS
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
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80',
        '00000000-0000-0000-0000-000000000011'::uuid
      ),
      (
        'Volta Rural STEM Clubs Expansion',
        'Set up after-school STEM clubs in selected Volta Region schools with facilitator training and low-cost science kits.',
        'Ho, Ghana',
        'proposed'::public.project_status,
        array['Regional Education Directorate', 'Bridge for Impact Hub']::text[],
        'Q3 2026 - Q2 2027',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80',
        '00000000-0000-0000-0000-000000000011'::uuid
      ),
      (
        'Northern Girls in Coding Fellowship',
        'Completed fellowship that trained young women in foundational coding, teamwork, and innovation challenge pitching.',
        'Tamale, Ghana',
        'completed'::public.project_status,
        array['Tamale Youth Center', 'Bridge for Impact Hub']::text[],
        'Completed in 2025',
        'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900&q=80',
        '00000000-0000-0000-0000-000000000014'::uuid
      ),
      (
        'Coastal Plastic Recovery Challenge',
        'Completed community clean-up and recycling activation project supporting youth-led waste sorting and awareness in coastal communities.',
        'Cape Coast, Ghana',
        'completed'::public.project_status,
        array['Cape Coast Assembly', 'Bridge for Impact Hub']::text[],
        'Completed in 2024',
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=900&q=80',
        '00000000-0000-0000-0000-000000000012'::uuid
      ),
      (
        'Kumasi Agribusiness Training Hub',
        'Empowering young local farmers with modern agribusiness techniques, supply chain knowledge, and value-added processing guides.',
        'Kumasi, Ghana',
        'proposed'::public.project_status,
        array['Ministry of Agriculture', 'Green Ghana Initiative']::text[],
        'Q4 2026 - Q3 2027',
        'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=900&q=80',
        '00000000-0000-0000-0000-000000000012'::uuid
      ),
      (
        'Eastern Region Clean Water Wells',
        'Rehabilitating broken wells and drilling new solar-powered clean water access points in remote Eastern region towns.',
        'Koforidua, Ghana',
        'ongoing'::public.project_status,
        array['WaterAid Ghana', 'Green Ghana Initiative']::text[],
        'Mar 2026 - Nov 2026',
        'https://images.unsplash.com/photo-1541913289053-43d92fb9c3c0?w=900&q=80',
        '00000000-0000-0000-0000-000000000012'::uuid
      ),
      (
        'Greater Accra Mobile Clinic Support',
        'Deploying a mobile van equipped with basic diagnostics and primary health medication to serve low-income suburbs.',
        'Accra, Ghana',
        'ongoing'::public.project_status,
        array['Ghana Health Service', 'Health for All Foundation']::text[],
        'Feb 2026 - Jan 2027',
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80',
        '00000000-0000-0000-0000-000000000013'::uuid
      ),
      (
        'Western Region Reforestation Drive',
        'Community-driven planting of indigenous trees in degraded forest reserves, tracking growth using digital mapping tools.',
        'Tarkwa, Ghana',
        'proposed'::public.project_status,
        array['Forestry Commission', 'Green Ghana Initiative']::text[],
        'Q1 2027 - Q4 2027',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900&q=80',
        '00000000-0000-0000-0000-000000000012'::uuid
      ),
      (
        'Brong Ahafo Literacy Campaign',
        'A concluded literacy and library stocking program targeting primary school pupils in rural communities.',
        'Sunyani, Ghana',
        'completed'::public.project_status,
        array['Ghana Library Authority', 'Ghana Education Aid']::text[],
        'Completed in 2025',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&q=80',
        '00000000-0000-0000-0000-000000000011'::uuid
      ),
      (
        'Central Region Fishery Development',
        'Assisting local fishing communities with sustainable fishing methods and solar cold storage facilities proposal.',
        'Elmina, Ghana',
        'proposed'::public.project_status,
        array['Fisheries Ministry', 'Bridge for Impact Hub']::text[],
        'Q2 2027 - Q1 2028',
        'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=900&q=80',
        '00000000-0000-0000-0000-000000000011'::uuid
      ),
      (
        'Upper West Solar Power Installation',
        'Installing sustainable solar power mini-grids for community clinics and schools in off-grid sectors.',
        'Wa, Ghana',
        'ongoing'::public.project_status,
        array['Ministry of Energy', 'Tech Empowerment Network']::text[],
        'May 2026 - Apr 2027',
        'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=900&q=80',
        '00000000-0000-0000-0000-000000000014'::uuid
      ),
      (
        'Upper East Handcrafts Incubator',
        'Completed capacity building program that trained local women weavers to access global e-commerce markets.',
        'Bolgatanga, Ghana',
        'completed'::public.project_status,
        array['Export Promotion Authority', 'Tech Empowerment Network']::text[],
        'Completed in 2025',
        'https://images.unsplash.com/photo-1606744824163-985d376605aa?w=900&q=80',
        '00000000-0000-0000-0000-000000000014'::uuid
      ),
      (
        'Savannah Agroforestry Initiative',
        'Promoting sustainable shea butter harvesting and intercropping models to preserve the savannah landscape.',
        'Damongo, Ghana',
        'ongoing'::public.project_status,
        array['Global Shea Alliance', 'Green Ghana Initiative']::text[],
        'Jun 2026 - Jun 2027',
        'https://images.unsplash.com/photo-1589923188900-85dae4409f7c?w=900&q=80',
        '00000000-0000-0000-0000-000000000012'::uuid
      )
  ) as seed(title, description, location, status, partners, timeline, image_url, created_by)
),
upsert_projects as (
  insert into public.projects (title, description, location, status, partners, timeline, image_url, created_by)
  select s.title, s.description, s.location, s.status, s.partners, s.timeline, s.image_url, s.created_by
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
  image_url = s.image_url,
  created_by = s.created_by
from project_seed s
where p.title = s.title;


-- 4. SEED 10 MEDIA ARTICLES
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
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80',
        'https://example.org/stories/ghanaian-campuses-innovation'
      ),
      (
        'From Proposal to Impact: Community Projects in Ghana',
        'An inside view of how project suggestions move through review to become action-ready interventions.',
        'A project idea becomes impactful when it moves through structured review, planning, and delivery. BIH collects suggestions, validates feasibility, aligns partners, and defines implementation milestones before publication.\n\nTransparent decisions improve collaboration and delivery quality.',
        'Operations Desk',
        'Transparency',
        '2026-02-18'::date,
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80',
        null
      ),
      (
        'Women-Led Tech Mentorship in West Africa',
        'Profiles of mentorship circles helping young women in Ghana and neighboring countries launch careers in digital fields.',
        'Women-led mentorship circles are improving access to digital careers by combining technical coaching with confidence-building and peer accountability.\n\nBIH tracks these initiatives as part of inclusive innovation programming.',
        'Regional Features',
        'Inclusion',
        '2026-02-10'::date,
        'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=900&q=80',
        'https://example.org/stories/women-led-tech-mentorship'
      ),
      (
        'Youth Climate Action: Lessons from Coastal Ghana',
        'Community youth groups are combining clean-up drives and practical recycling education to reduce local waste pressure.',
        'Coastal communities in Ghana are increasingly led by youth climate groups that organize recurring clean-up operations and practical environmental education.\n\nLocal ownership and steady execution remain the strongest predictors of measurable impact.',
        'Community Desk',
        'Environment',
        '2026-01-29'::date,
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=900&q=80',
        null
      ),
      (
        'Building Trust Through Data in African Nonprofits',
        'How clear reporting and open dashboards improve donor confidence and strengthen collaboration outcomes.',
        'Trust in nonprofit work increases when data is consistent, easy to understand, and tied to outcomes.\n\nFor BIH, shared reporting helps volunteers, NGOs, and funders stay aligned on progress and trade-offs.',
        'BIH Research Unit',
        'Governance',
        '2026-01-16'::date,
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
        'https://example.org/stories/data-trust-african-nonprofits'
      ),
      (
        'Scaling Solar Energy in Rural Sub-Saharan Communities',
        'Examines the direct local benefits of solar mini-grid installations for off-grid schools and clinics.',
        'Solar technology provides consistent utility access to clinics and learning environments in rural sectors, accelerating community integration and capacity building.',
        'Energy Section',
        'Technology',
        '2026-03-05'::date,
        'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=900&q=80',
        'https://example.org/stories/scaling-solar-energy'
      ),
      (
        'Preserving Indigenous Forests: Green Ghana in Action',
        'Detailed feature mapping our forestry reserves restoration and local tree planting campaigns.',
        'A long-term look at reforestation achievements. Green Ghana partners with local youth groups to seed and map indigenous trees, safeguarding ecosystems for generations.',
        'Environment Desk',
        'Environment',
        '2026-03-08'::date,
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900&q=80',
        null
      ),
      (
        'Mobile Clinics Bridge Health Gaps in Low-Income Areas',
        'How temporary health vans provide vital diagnostic care and essential treatment in suburbs.',
        'Access to primary healthcare has historically been a challenge in remote suburbs. Mobile clinics bridge this gap by bringing medical personnel and testing equipment straight to families.',
        'Health Desk',
        'Health',
        '2026-03-10'::date,
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80',
        'https://example.org/stories/mobile-clinics-health'
      ),
      (
        'Digital Literacy for Rural Women Farmers in Volta',
        'Highlights digital tools helping women farmers check weather forecasts, market prices, and secure payments.',
        'Providing agricultural tools to women farmers in the Volta Region ensures they stay updated on prices and secure payment channels, growing local economics.',
        'Rural Outreach',
        'Inclusion',
        '2026-03-12'::date,
        'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=900&q=80',
        null
      ),
      (
        'Shea Butter and Conservation: A Sustainable Agroforestry Model',
        'Exploring how Shea Butter cooperatives protect the Savannah landscape while improving livelihoods.',
        'Shea butter cooperatives in northern Ghana highlight how sustainable farming models protect local biodiversity while providing dependable economic livelihoods to local families.',
        'Agroforestry Unit',
        'Agriculture',
        '2026-03-14'::date,
        'https://images.unsplash.com/photo-1589923188900-85dae4409f7c?w=900&q=80',
        'https://example.org/stories/shea-conservation-agroforestry'
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
