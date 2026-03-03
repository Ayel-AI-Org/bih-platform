-- WARNING: DESTRUCTIVE SCRIPT
-- Run this to empty BIH data and start fresh.
-- This removes all records from public Phase 1 tables.
-- Optional section at the bottom removes all auth users too.

begin;

truncate table
  public.donations,
  public.project_suggestions,
  public.projects,
  public.media_articles,
  public.volunteer_profiles,
  public.ngo_profiles,
  public.donor_profiles,
  public.profiles
restart identity cascade;

commit;

-- OPTIONAL: Uncomment only if you also want to remove all Supabase Auth users.
-- This is irreversible and will clear login accounts.
begin;
delete from auth.users;
commit;
