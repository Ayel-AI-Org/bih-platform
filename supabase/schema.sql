-- BIH Phase 1 Supabase schema + RLS
create extension if not exists "pgcrypto";

create type user_role as enum ('volunteer', 'ngo', 'donor', 'admin');
create type project_status as enum ('proposed', 'ongoing', 'completed');
create type suggestion_status as enum ('pending', 'approved', 'rejected');
create type payment_method as enum ('mobile_money', 'card');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists volunteer_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  phone text not null,
  location text not null,
  skills text not null,
  availability text not null,
  created_at timestamptz not null default now()
);

create table if not exists ngo_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  organization_name text not null,
  contact_person text not null,
  phone text not null,
  focus_area text not null,
  registration_number text not null,
  created_at timestamptz not null default now()
);

create table if not exists donor_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  phone text not null,
  donor_type text not null,
  interests text not null,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  status project_status not null,
  partners text[] not null default '{}',
  timeline text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists project_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  timeline text not null,
  submitted_by text not null,
  email text not null,
  phone text,
  organization text,
  category text,
  expected_budget numeric(12,2),
  beneficiaries text,
  admin_notes text,
  reviewed_at timestamptz,
  status suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  payment_method payment_method not null,
  purpose text not null,
  message text,
  confirmation_email_status text not null default 'sent',
  created_at timestamptz not null default now()
);

create table if not exists media_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  author text not null,
  category text not null,
  published_at date not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

alter table profiles enable row level security;
alter table volunteer_profiles enable row level security;
alter table ngo_profiles enable row level security;
alter table donor_profiles enable row level security;
alter table projects enable row level security;
alter table project_suggestions enable row level security;
alter table donations enable row level security;
alter table media_articles enable row level security;

-- Public reads
create policy "public read projects" on projects
for select using (true);

create policy "admin insert projects" on projects
for insert with check (is_admin());

create policy "admin update projects" on projects
for update using (is_admin());

create policy "admin delete projects" on projects
for delete using (is_admin());

create policy "public read media" on media_articles
for select using (true);

-- Profiles
create policy "users read own profile" on profiles
for select using (auth.uid() = id or is_admin());

create policy "users insert own profile" on profiles
for insert with check (auth.uid() = id);

create policy "users update own profile" on profiles
for update using (auth.uid() = id);

-- Role-specific profiles
create policy "insert own volunteer profile" on volunteer_profiles
for insert with check (auth.uid() = user_id);

create policy "insert own ngo profile" on ngo_profiles
for insert with check (auth.uid() = user_id);

create policy "insert own donor profile" on donor_profiles
for insert with check (auth.uid() = user_id);

create policy "admin read volunteers" on volunteer_profiles
for select using (is_admin());

create policy "admin read ngos" on ngo_profiles
for select using (is_admin());

create policy "admin read donors" on donor_profiles
for select using (is_admin());

-- Suggestions
create policy "public insert suggestions" on project_suggestions
for insert with check (true);

create policy "admin read suggestions" on project_suggestions
for select using (is_admin());

create policy "admin update suggestions" on project_suggestions
for update using (is_admin());

-- Donations
create policy "public insert donations" on donations
for insert with check (true);

create policy "admin read donations" on donations
for select using (is_admin());

-- Seed base data (idempotent)
insert into projects (title, description, location, status, partners, timeline, image_url)
select * from (
  values
    (
      'Clean Water Initiative',
      'Providing sustainable clean water access to rural communities through borehole drilling and maintenance training.',
      'Northern Region',
      'ongoing'::project_status,
      array['WaterAid', 'Local Council'],
      'Jan 2026 - Aug 2026',
      'https://images.unsplash.com/photo-1594398901394-4e34939a02d0?w=900&q=80'
    ),
    (
      'Youth Skills Training',
      'Digital literacy and vocational training program for underserved youth with mentorship and placement support.',
      'Urban District',
      'proposed'::project_status,
      array['Tech4Good', 'UNICEF'],
      'Q3 2026',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=80'
    ),
    (
      'Community Health Outreach',
      'Free health screenings and wellness education reaching thousands across multiple communities.',
      'Eastern Province',
      'completed'::project_status,
      array['Red Cross', 'Ministry of Health'],
      'Completed in 2025',
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80'
    )
) as seed(title, description, location, status, partners, timeline, image_url)
where not exists (select 1 from projects);

insert into media_articles (title, summary, author, category, published_at, image_url)
select * from (
  values
    (
      'How Collaborative Giving Scales Local Impact',
      'A look at how BIH partnerships improve project execution and accountability across communities.',
      'BIH Editorial Team',
      'Impact',
      '2026-01-14'::date,
      'https://images.unsplash.com/photo-1521790797524-b2497295b8a0?w=900&q=80'
    ),
    (
      'Volunteer Spotlight: Youth Mentors in Action',
      'Meet volunteers enabling digital literacy and career readiness in underserved areas.',
      'Community Desk',
      'Volunteer Stories',
      '2026-02-03'::date,
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80'
    ),
    (
      'Transparent Donations: Where Every Contribution Goes',
      'Understanding BIH donation tracking from pledge to measurable outcomes.',
      'BIH Finance Office',
      'Transparency',
      '2026-02-20'::date,
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&q=80'
    )
) as seed(title, summary, author, category, published_at, image_url)
where not exists (select 1 from media_articles);
