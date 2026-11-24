-- Migration: project-suggestions-submitter-id.sql
-- Description: Adds submitter_id column to public.project_suggestions if not present,
-- updates RLS policies for anonymous/authenticated submitters and admins,
-- and signals PostgREST to reload its schema cache.

-- 1. Add submitter_id referencing auth.users safely (nullable for anonymous/public proposals)
ALTER TABLE public.project_suggestions
ADD COLUMN IF NOT EXISTS submitter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

-- 2. Ensure Anyone can submit suggestions (both unauthenticated public visitors and authenticated users)
DROP POLICY IF EXISTS "Anyone can submit suggestion" ON public.project_suggestions;
CREATE POLICY "Anyone can submit suggestion"
ON public.project_suggestions FOR INSERT
WITH CHECK (true);

-- 3. Ensure Admins can read all suggestions
DROP POLICY IF EXISTS "Admins read all suggestions" ON public.project_suggestions;
DROP POLICY IF EXISTS "admin read all suggestions" ON public.project_suggestions;
CREATE POLICY "Admins read all suggestions"
ON public.project_suggestions FOR SELECT
USING (public.is_admin());

-- 4. Ensure Authenticated submitters can read their own proposals
DROP POLICY IF EXISTS "Submitters read own suggestions" ON public.project_suggestions;
DROP POLICY IF EXISTS "users read own suggestions" ON public.project_suggestions;
CREATE POLICY "Submitters read own suggestions"
ON public.project_suggestions FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = submitter_id
);

-- 5. Ensure Admins can update suggestions (review, notes, approval, rejection)
DROP POLICY IF EXISTS "Admins update suggestions" ON public.project_suggestions;
CREATE POLICY "Admins update suggestions"
ON public.project_suggestions FOR UPDATE
USING (public.is_admin());

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
