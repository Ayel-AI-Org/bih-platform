-- BIH test seed data (idempotent)
-- Purpose: populate sample Ghana-focused records for testing.
-- Includes:
--   - 4 projects (2 completed, 1 ongoing, 1 proposed)
--   - 5 media articles (African context, Ghana-focused)

begin;

insert into public.projects (title, description, location, status, partners, timeline, image_url)
select seed.title, seed.description, seed.location, seed.status, seed.partners, seed.timeline, seed.image_url
from (
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
      with project_seed as (
      'Q3 2026 - Q2 2027',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=80'
    ),
    (
      'Northern Girls in Coding Fellowship',
      'Completed fellowship that trained young women in foundational coding, teamwork, and innovation challenge pitching.',
      'Tamale, Ghana',
      'completed'::public.project_status,
            'https://source.unsplash.com/1600x900/?ghana,university,students,training'
      'Completed in 2025',
      'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900&q=80'
    ),
    (
      'Coastal Plastic Recovery Challenge',
      'Completed community clean-up and recycling activation project supporting youth-led waste sorting and awareness in coastal communities.',
      'Cape Coast, Ghana',
      'completed'::public.project_status,
            'https://source.unsplash.com/1600x900/?ghana,school,science,africa'
      'Completed in 2024',
      'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=900&q=80'
    )
) as seed(title, description, location, status, partners, timeline, image_url)
where not exists (
  select 1
  from public.projects p
  where p.title = seed.title
            'https://source.unsplash.com/1600x900/?african,women,technology,ghana'

insert into public.media_articles (title, summary, author, category, published_at, image_url)
select seed.title, seed.summary, seed.author, seed.category, seed.published_at, seed.image_url
from (
  values
    (
      'How Ghanaian Campuses Are Driving Community Innovation',
      'A look at student-led initiatives from Legon and beyond that are turning local ideas into measurable social impact.',
            'https://source.unsplash.com/1600x900/?ghana,coast,community,cleanup'
      'Innovation',
      ) as seed(title, description, location, status, partners, timeline, image_url)
      ),
      insert_projects as (
        insert into public.projects (title, description, location, status, partners, timeline, image_url)
        select seed.title, seed.description, seed.location, seed.status, seed.partners, seed.timeline, seed.image_url
        from project_seed seed
        where not exists (
          select 1
          from public.projects p
          where p.title = seed.title
        )
        returning id
      )
      update public.projects p
      set
        description = seed.description,
        location = seed.location,
        status = seed.status,
        partners = seed.partners,
        timeline = seed.timeline,
        image_url = seed.image_url
      from project_seed seed
      where p.title = seed.title;

      with media_seed as (
        values
          (
            'How Ghanaian Campuses Are Driving Community Innovation',
            'A look at student-led initiatives from Legon and beyond that are turning local ideas into measurable social impact.',
            'Across Ghanaian campuses, student innovation hubs are addressing real community needs through practical service projects. At Legon, teams are combining peer mentoring, project planning clinics, and local partnerships to move ideas from concept to execution.\n\nThe strongest programs share three patterns: they define a clear problem statement, build with community input from the start, and track measurable outcomes over time. These patterns help young leaders avoid one-off activities and focus on sustained impact.\n\nFor BIH, campus ecosystems are important because they provide committed volunteers, tested project concepts, and strong collaboration pathways with NGOs and local authorities. The result is faster implementation and better accountability for community-facing initiatives.',
            'BIH Editorial Team',
            'Innovation',
            '2026-03-01'::date,
            'https://source.unsplash.com/1600x900/?ghana,university,african,students'
          ),
          (
            'From Proposal to Impact: Community Projects in Ghana',
            'An inside view of how project suggestions move through review to become action-ready interventions.',
            'A project idea becomes impactful only when it moves through structured review, planning, and delivery. BIH applies this approach by collecting suggestions, validating feasibility, aligning partners, and defining implementation milestones.\n\nIn Ghana, local context is critical. Community priorities differ between urban areas like Accra and regional communities in Volta or Northern Ghana. Project scoping therefore emphasizes beneficiary profiling, resource mapping, and practical delivery constraints.\n\nTransparent decision-making builds trust. When stakeholders can see why a project is approved, revised, or deferred, collaboration improves and long-term execution becomes more reliable.',
            'Operations Desk',
            'Transparency',
            '2026-02-18'::date,
            'https://source.unsplash.com/1600x900/?ghana,community,meeting,africa'
          ),
          (
            'Women-Led Tech Mentorship in West Africa',
            'Profiles of mentorship circles helping young women in Ghana and neighboring countries launch careers in digital fields.',
            'Women-led mentorship circles are improving access to digital careers by combining technical coaching with confidence-building and peer accountability. In Ghana, these programs are creating stronger pathways for young women into coding, product design, and project leadership roles.\n\nEffective mentorship extends beyond classroom instruction. It includes portfolio support, interview preparation, and real collaboration opportunities with NGOs and social enterprises. This hands-on model significantly improves transition from training to impact work.\n\nBIH recognizes mentorship as a force multiplier: when one trained mentor supports a cohort of emerging practitioners, local innovation capacity grows faster and becomes more sustainable over time.',
            'Regional Features',
            'Inclusion',
            '2026-02-10'::date,
            'https://source.unsplash.com/1600x900/?african,women,technology,mentorship'
          ),
          (
            'Youth Climate Action: Lessons from Coastal Ghana',
            'Community youth groups are combining clean-up drives and practical recycling education to reduce local waste pressure.',
            'Coastal communities in Ghana are increasingly led by youth climate groups that organize recurring clean-up operations and practical environmental education. Their approach links immediate action with long-term behavior change, especially around waste sorting and responsible disposal.\n\nThe most successful groups collaborate with schools, municipal teams, and neighborhood leaders to keep efforts continuous rather than one-time events. By sharing simple community metrics—such as volume of recovered plastic—they maintain motivation and improve accountability.\n\nFor BIH, youth-led climate projects demonstrate how local ownership and consistent execution can produce visible environmental gains while strengthening civic participation.',
            'Community Desk',
            'Environment',
            '2026-01-29'::date,
            'https://source.unsplash.com/1600x900/?ghana,coast,environment,africa'
          ),
          (
            'Building Trust Through Data in African Nonprofits',
            'How clear reporting and open dashboards improve donor confidence and strengthen collaboration outcomes.',
            'Trust in nonprofit work increases when data is easy to understand, consistently updated, and tied to real outcomes. Across African nonprofit ecosystems, teams are adopting simpler dashboards that communicate what was planned, what was delivered, and what changed.\n\nIn the BIH context, transparent reporting improves both donor confidence and partner coordination. Volunteers, NGOs, and funders can align around a shared picture of project progress, reducing duplication and improving response speed when adjustments are needed.\n\nStrong reporting does not require complex tooling first; it requires disciplined data capture, clear baseline metrics, and regular communication of results.',
            'BIH Research Unit',
            'Governance',
            '2026-01-16'::date,
            'https://source.unsplash.com/1600x900/?africa,nonprofit,data,teamwork'
          )
      ) as seed(title, summary, content, author, category, published_at, image_url)
      ),
      insert_media as (
        insert into public.media_articles (title, summary, content, author, category, published_at, image_url)
        select seed.title, seed.summary, seed.content, seed.author, seed.category, seed.published_at, seed.image_url
        from media_seed seed
        where not exists (
          select 1
          from public.media_articles m
          where m.title = seed.title
        )
        returning id
      )
      update public.media_articles m
      set
        summary = seed.summary,
        content = seed.content,
        author = seed.author,
        category = seed.category,
        published_at = seed.published_at,
        image_url = seed.image_url
      from media_seed seed
      where m.title = seed.title;
