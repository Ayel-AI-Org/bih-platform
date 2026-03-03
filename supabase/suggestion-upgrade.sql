-- Run this once on existing Supabase projects to upgrade suggestion review fields
alter table if exists public.project_suggestions
  add column if not exists phone text,
  add column if not exists organization text,
  add column if not exists category text,
  add column if not exists expected_budget numeric(12,2),
  add column if not exists beneficiaries text,
  add column if not exists admin_notes text,
  add column if not exists reviewed_at timestamptz;
