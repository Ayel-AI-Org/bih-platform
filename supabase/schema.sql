-- Drop existing types if resetting
drop type if exists user_role cascade;
drop type if exists approval_status cascade;
drop type if exists suggestion_status cascade;
drop type if exists project_status cascade;
drop type if exists payment_method cascade;
drop type if exists portfolio_status cascade;
drop type if exists log_status cascade;

-- Drop child tables first, or use CASCADE to override foreign key constraints
drop table if exists volunteer_profiles cascade;
drop table if exists ngo_profiles cascade;
drop table if exists donor_profiles cascade;
drop table if exists profiles cascade;

-- Drop independent tables
drop table if exists projects cascade;
drop table if exists project_suggestions cascade;
drop table if exists donations cascade;
drop table if exists media_articles cascade;


-- Recreate cleanly
create type user_role as enum ('volunteer', 'ngo', 'donor', 'admin');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type suggestion_status as enum ('pending', 'reviewing', 'approved', 'rejected');
create type project_status as enum ('proposed', 'ongoing', 'completed');
create type payment_method as enum ('mobile_money', 'card', 'bank_transfer');
create type portfolio_status as enum ('draft', 'pending', 'published', 'archived');
create type log_status as enum ('logged', 'verified', 'voided');


create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  bio text,
  country text default 'Ghana',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.volunteer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null,
  location text not null,
  skills text[] default '{}',
  availability text not null,
  total_verified_hours numeric default 0,
  badge_level text default 'newcomer',
  approval_status approval_status default 'pending',
  linkedin_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.ngo_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  organization_name text not null,
  contact_person text not null,
  phone text not null,
  focus_area text not null,
  registration_number text,
  website_url text,
  approval_status approval_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.donor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  donor_type text not null,
  interests text[] default '{}',
  total_donated numeric default 0,
  approval_status approval_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  status project_status default 'proposed',
  category text,
  partners text[] default '{}',
  timeline text,
  image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.project_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  timeline text,
  submitted_by text not null,
  email text not null,
  phone text,
  organization text,
  category text,
  expected_budget numeric,
  beneficiaries text,
  status suggestion_status default 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  role_played text not null,
  project_id uuid references public.projects(id),
  media_urls text[] default '{}',
  status portfolio_status default 'draft',
  visibility text check (visibility in ('public','internal')) default 'internal',
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.commitment_logs (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  hours numeric not null check (hours > 0),
  activity_description text not null,
  log_date date not null,
  status log_status default 'logged',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  void_ref uuid references public.commitment_logs(id),
  created_at timestamptz default now()
);
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  completed_at timestamptz,
  evidence_urls text[] default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.profiles(id),
  full_name text not null,
  email text not null,
  amount numeric not null check (amount > 0),
  currency text default 'GHS',
  payment_method payment_method not null,
  purpose text,
  message text,
  paystack_reference text unique,
  status text check (status in ('pending','success','failed')) default 'pending',
  confirmation_email_status text default 'pending',
  created_at timestamptz default now()
);
create table public.media_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  content text not null,
  author text not null,
  category text not null,
  image_url text,
  full_story_url text,
  published_at date,
  is_published boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.volunteer_profiles enable row level security;
alter table public.ngo_profiles enable row level security;
alter table public.donor_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_suggestions enable row level security;
alter table public.portfolio_entries enable row level security;
alter table public.commitment_logs enable row level security;
alter table public.milestones enable row level security;
alter table public.donations enable row level security;
alter table public.media_articles enable row level security;


-- ============================================
-- HELPER FUNCTION: is_admin()
-- ============================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- ============================================
-- PROFILES
-- ============================================
create policy "Users view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users insert own profile"
on public.profiles for insert
with check (auth.uid() = id or auth.uid() is null);

create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = id);

create policy "Admins read all profiles"
on public.profiles for select
using (public.is_admin());

-- ============================================
-- VOLUNTEER PROFILES
-- ============================================
create policy "Volunteers view own profile"
on public.volunteer_profiles for select
using (auth.uid() = user_id);

create policy "Volunteers insert own profile"
on public.volunteer_profiles for insert
with check (auth.uid() = user_id or auth.uid() is null);

create policy "Volunteers update own profile"
on public.volunteer_profiles for update
using (auth.uid() = user_id);

create policy "Admins read all volunteer profiles"
on public.volunteer_profiles for select
using (public.is_admin());

create policy "Admins update volunteer profiles"
on public.volunteer_profiles for update
using (public.is_admin());

-- ============================================
-- NGO PROFILES
-- ============================================
create policy "NGOs view own profile"
on public.ngo_profiles for select
using (auth.uid() = user_id);

create policy "NGOs insert own profile"
on public.ngo_profiles for insert
with check (auth.uid() = user_id or auth.uid() is null);

create policy "NGOs update own profile"
on public.ngo_profiles for update
using (auth.uid() = user_id);

create policy "Admins read all ngo profiles"
on public.ngo_profiles for select
using (public.is_admin());

create policy "Admins update ngo profiles"
on public.ngo_profiles for update
using (public.is_admin());

-- ============================================
-- DONOR PROFILES
-- ============================================
create policy "Donors view own profile"
on public.donor_profiles for select
using (auth.uid() = user_id);

create policy "Donors insert own profile"
on public.donor_profiles for insert
with check (auth.uid() = user_id or auth.uid() is null);

create policy "Donors update own profile"
on public.donor_profiles for update
using (auth.uid() = user_id);

create policy "Admins read all donor profiles"
on public.donor_profiles for select
using (public.is_admin());

create policy "Admins update donor profiles"
on public.donor_profiles for update
using (public.is_admin());

-- ============================================
-- PROJECTS (public read, admin write)
-- ============================================
create policy "Public can read published projects"
on public.projects for select
using (true);

create policy "Admins insert projects"
on public.projects for insert
with check (public.is_admin());

create policy "Admins update projects"
on public.projects for update
using (public.is_admin());

create policy "Admins delete projects"
on public.projects for delete
using (public.is_admin());

-- ============================================
-- PROJECT SUGGESTIONS (public submit, admin review)
-- ============================================
create policy "Anyone can submit suggestion"
on public.project_suggestions for insert
with check (true);

create policy "Admins read all suggestions"
on public.project_suggestions for select
using (public.is_admin());

create policy "Admins update suggestions"
on public.project_suggestions for update
using (public.is_admin());

-- ============================================
-- PORTFOLIO ENTRIES
-- ============================================
create policy "Owners view own entries"
on public.portfolio_entries for select
using (auth.uid() = user_id);

create policy "Owners insert own entries"
on public.portfolio_entries for insert
with check (auth.uid() = user_id);

create policy "Owners update own draft entries"
on public.portfolio_entries for update
using (auth.uid() = user_id and status = 'draft');

create policy "Public read published entries"
on public.portfolio_entries for select
using (status = 'published' and visibility = 'public');

create policy "Admins read all entries"
on public.portfolio_entries for select
using (public.is_admin());

create policy "Admins update all entries"
on public.portfolio_entries for update
using (public.is_admin());

-- ============================================
-- COMMITMENT LOGS (append-only)
-- ============================================
create policy "Volunteers view own logs"
on public.commitment_logs for select
using (auth.uid() = volunteer_id);

create policy "Volunteers insert own logs"
on public.commitment_logs for insert
with check (auth.uid() = volunteer_id);

create policy "Admins read all logs"
on public.commitment_logs for select
using (public.is_admin());

create policy "Admins verify logs"
on public.commitment_logs for update
using (public.is_admin());

create policy "NGOs read logs for their projects"
on public.commitment_logs for select
using (
  exists (
    select 1 from public.projects
    where projects.id = commitment_logs.project_id
    and projects.created_by = auth.uid()
  )
);

-- ============================================
-- MILESTONES
-- ============================================
create policy "Public read milestones"
on public.milestones for select
using (true);

create policy "Admins insert milestones"
on public.milestones for insert
with check (public.is_admin());

create policy "Admins update milestones"
on public.milestones for update
using (public.is_admin());

-- ============================================
-- DONATIONS
-- ============================================
create policy "Donors view own donations"
on public.donations for select
using (auth.uid() = donor_id);


create policy "Admins read all donations"
on public.donations for select
using (public.is_admin());

create policy "Admins update donation status"
on public.donations for update
using (public.is_admin());

-- ============================================
-- MEDIA ARTICLES
-- ============================================
create policy "Public read published articles"
on public.media_articles for select
using (is_published = true);

create policy "Admins read all articles"
on public.media_articles for select
using (public.is_admin());

create policy "Admins insert articles"
on public.media_articles for insert
with check (public.is_admin());

create policy "Admins update articles"
on public.media_articles for update
using (public.is_admin());

create policy "Admins delete articles"
on public.media_articles for delete
using (public.is_admin());