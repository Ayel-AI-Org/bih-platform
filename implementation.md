# Codebase Audit & Implementation Plan: BIH Impact Ecosystem
**Prepared by:** Senior DevSecOps Engineer & Solutions Architect
**Status:** Under Review (Requesting Founder Approval)

---

## 1. Critical Structural Shortcomings

This section details the exact files, lines, and database schemas in the current MVP codebase that conflict with the expanded requirements of the Digital Impact Ecosystem.

### A. Database Schema Gaps (`supabase/schema.sql`)
1. **Total Absence of Impact Entities:** 
   The current schema lacks tables for `portfolio_entries`, `milestones`, and `commitment_logs`. There is currently no database structure to record volunteer hours, showcase individual projects, or track progress toward targets.
2. **Lax Data Types for Volunteer Profiles:** 
   In [supabase/schema.sql:L38-L46](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/supabase/schema.sql#L38-L46), `skills` and `availability` are defined as plain `text` columns. However, the frontend in [AdminDashboardPage.tsx:L109-L132](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/src/pages/AdminDashboardPage.tsx#L109-L132) attempts to parse these fields as JSON payloads (`safeParse(row.skills)`). This mismatch causes data inconsistency: if a volunteer profile is created with normal text, the frontend's JSON-parsing logic fails and falls back to raw string rendering, preventing structured querying of skill sets.
3. **No Opt-In Visibility or Public Profiles:** 
   The `profiles` and role-specific tables have no flag (e.g., `is_public` or `opt_in_portfolio`) to support the new requirement for **"Public volunteer & partner portfolio pages — opt-in visibility"**.

### B. Access Control & API Logic (`src/lib/platform-data.ts`)
1. **No Portfolio, Hours, or Milestone Services:** 
   The core data-access library [platform-data.ts](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/src/lib/platform-data.ts) contains no endpoints to manage showcases, log hours, or verify contributions.
2. **No Validation on JSONB Suggestion Payloads:** 
   In [platform-data.ts:L300-L316](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/src/lib/platform-data.ts#L300-L316), the `suggestProject` function inserts raw form data directly into a JSONB column (`project_data`) without validating structure or schema types. This bypasses compile-time safety and leaves the database vulnerable to corrupted objects.

### C. Frontend Routing Gaps (`src/App.tsx` & `src/pages/*`)
1. **Completely Unguarded Routing:** 
   In [App.tsx:L41-L56](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/src/App.tsx#L41-L56), routes like `/admin` and `/profile` are exposed directly without any route protection components:
   ```tsx
   <Route path="/profile" element={<UserProfileDashboard />} />
   <Route path="/admin" element={<AdminDashboardPage />} />
   ```
   Relying on in-page redirects creates a flash of unauthorized content and increases client-side bundle vulnerability. A standard volunteer can navigate to `/admin` and mount the component, relying solely on a late-running database query hook to redirect them away.
2. **Shared and Bloated User Dashboard:** 
   The [UserProfileDashboard.tsx](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/src/pages/UserProfileDashboard.tsx) component is a single, giant file that conditionally renders content based on `session.role` ([UserProfileDashboard.tsx:L171-L229](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/src/pages/UserProfileDashboard.tsx#L171-L229)). This structural pattern is difficult to maintain and lacks the design space needed to host complex features like:
   - Volunteer hour-logging forms
   - Showcase upload modules
   - NGO verification workflows
   - Donor history logs

---

## 2. Security & RLS Gaps

An analysis of the current database configuration shows critical security vulnerabilities that would allow unauthorized data modification or prevent standard users from accessing their own history.

### A. Defective Select Policies blocking User Access
1. **Donors Blocked from Viewing Donation History:**
   The current select policy on `donations` in [supabase/schema.sql:L261](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/supabase/schema.sql#L261) is:
   ```sql
   create policy "admin read donations" on public.donations for select using (public.is_admin());
   ```
   This prevents a logged-in donor from viewing their own donation history on their profile. Under this policy, any query made by a standard user to view their own transactions will return zero records.
2. **Volunteers/NGOs Blocked from Viewing Own Suggestions:**
   Similarly, the select policy on `project_suggestions` in [supabase/schema.sql:L251](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/supabase/schema.sql#L251) only permits admin selection:
   ```sql
   create policy "admin read suggestions" on public.project_suggestions for select using (public.is_admin());
   ```
   This blocks users from tracking the status of suggestions they submitted.

### B. Vulnerable Insertion & Modify Permissions
1. **Lack of User Constraints on Suggestion Submission:**
   The suggestion policy in [supabase/schema.sql:L248](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/supabase/schema.sql#L248) is:
   ```sql
   create policy "public insert suggestions" on public.project_suggestions
     for insert with check (submitted_by is null or auth.uid() = submitted_by);
   ```
   While this ensures authenticated users cannot spoof the `submitted_by` ID, there is no check preventing a user from spamming suggestion entries or writing directly into someone else's metadata.
2. **Unsecured Edge Function Endpoints:**
   In [README.md:L54](file:///c:/Users/Ayel-son/Desktop/BIH/bih-platform/README.md#L54), the `project-polish` edge function is deployed with `verify_jwt = false`. While necessary for public chatbot endpoints, disabling JWT verification on a function that mutates project descriptions allows any public agent to trigger AI description updates if they discover the URL.

---

## 3. Refactoring Roadmap

This step-by-step roadmap outlines how to modify the database and refactor the frontend structure to implement the new portal features cleanly.

### Step 1: Database Schema Expansion (Supabase Migrations)
1. Add an enum `public.showcase_status`: `('draft', 'pending', 'published', 'archived')`.
2. Add an enum `public.verification_status`: `('pending_verification', 'verified', 'rejected', 'voided')`.
3. Create `public.portfolio_entries` table:
   - `id` (uuid, primary key)
   - `user_id` (uuid, FK -> profiles.id)
   - `project_id` (uuid, FK -> projects.id, nullable for independent work)
   - `title` (text), `description` (text), `role_played` (text), `outcomes` (text), `media_urls` (text[])
   - `status` (public.showcase_status, default 'draft')
   - `admin_feedback` (text, nullable)
   - `is_public` (boolean, default false)
   - `created_at` / `updated_at` (timestamptz)
4. Create `public.commitment_logs` table (Append-Only Hours Ledger):
   - `id` (uuid, primary key)
   - `volunteer_id` (uuid, FK -> profiles.id)
   - `project_id` (uuid, FK -> projects.id)
   - `hours_logged` (numeric(5,2))
   - `activity_description` (text)
   - `status` (public.verification_status, default 'pending_verification')
   - `verified_by` (uuid, FK -> profiles.id, nullable)
   - `verified_at` (timestamptz, nullable)
   - `voided_by_log_id` (uuid, FK -> commitment_logs.id, nullable)
   - `void_reason` (text, nullable)
   - `created_at` (timestamptz)
5. Create `public.milestones` table:
   - `id` (uuid, primary key)
   - `project_id` (uuid, FK -> projects.id)
   - `title` (text), `description` (text)
   - `target_date` (date), `completion_date` (date, nullable)
   - `evidence_url` (text, nullable)
   - `created_by` (uuid, FK -> profiles.id)
6. Add `is_public` boolean to `public.profiles` (default false) to control opt-in portfolio visibility.
7. Apply strict database trigger and RLS constraints to enforce append-only rules on `commitment_logs`.

### Step 2: Backend API Upgrades (`src/lib/platform-data.ts`)
1. Define TypeScript interfaces for the new entities in `src/types/models.ts`.
2. Add portfolio operations:
   - `createPortfolioEntry()`, `savePortfolioDraft()`, `submitPortfolioEntry()`, `getPortfolioEntries()`.
3. Add hour logging operations:
   - `logVolunteerHours()`, `getVolunteerHoursLog()`, `verifyHoursLog()`, `voidHoursLog()`.
4. Add milestone operations:
   - `getProjectMilestones()`, `createMilestone()`, `completeMilestone()`.

### Step 3: Frontend Routing Security (`src/App.tsx`)
1. Create a `ProtectedRoute.tsx` component in `src/components/layout/`.
2. Wrap `/admin` in `<ProtectedRoute allowedRoles={['admin']}>`.
3. Wrap `/profile` in `<ProtectedRoute allowedRoles={['volunteer', 'ngo', 'donor']}>`.

### Step 4: Decompose Dashboard (`src/pages/UserProfileDashboard.tsx`)
1. Extract role-specific components:
   - Create `src/components/dashboard/VolunteerDashboard.tsx` (Hours submission form, hour logs table, showcase manager dashboard).
   - Create `src/components/dashboard/NgoDashboard.tsx` (Pending volunteer hours verification queue, project post dashboard).
   - Create `src/components/dashboard/DonorDashboard.tsx` (Self donation ledger, impact milestone stats).
2. Refactor `UserProfileDashboard.tsx` to act strictly as a routing and session-resolving container that mounts the appropriate component.

---

## 4. Code Blueprint Examples

These exact code blocks demonstrate how to implement the required architectural and security standards.

### A. Immutable Database Trigger for `commitment_logs`
Run this script in the Supabase SQL editor to create the append-only table and attach a security trigger.

```sql
-- Create Verification Status Type
CREATE TYPE public.verification_status AS ENUM ('pending_verification', 'verified', 'rejected', 'voided');

-- Create Append-Only Commitment Logs Table
CREATE TABLE public.commitment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hours_logged numeric(5,2) NOT NULL CHECK (hours_logged > 0.00 AND hours_logged <= 24.00),
  activity_description text NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending_verification',
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  voided_by_log_id uuid REFERENCES public.commitment_logs(id) ON DELETE SET NULL,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commitment_logs ENABLE ROW LEVEL SECURITY;

-- Select policy: Users read own logs, NGO partners read logs for their projects, Admins read all
CREATE POLICY "users read own logs" ON public.commitment_logs
  FOR SELECT USING (
    auth.uid() = volunteer_id 
    OR public.is_admin()
    OR EXISTS (
      -- Checks if user is an NGO and their organization name matches partners assigned to the project
      SELECT 1 FROM public.projects p
      JOIN public.ngo_profiles n ON n.profile_id = auth.uid()
      WHERE p.id = commitment_logs.project_id AND n.organization_name = ANY(p.partners)
    )
  );

-- Insert policy: Volunteers can only insert logs for themselves with status 'pending_verification'
CREATE POLICY "volunteers insert own logs" ON public.commitment_logs
  FOR INSERT WITH CHECK (
    auth.uid() = volunteer_id
    AND status = 'pending_verification'::public.verification_status
    AND verified_by IS NULL
    AND verified_at IS NULL
    AND voided_by_log_id IS NULL
  );

-- Update policy: Only Admins or linked NGO partners can update status/verification details
CREATE POLICY "supervisors verify logs" ON public.commitment_logs
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.ngo_profiles n ON n.profile_id = auth.uid()
      WHERE p.id = commitment_logs.project_id AND n.organization_name = ANY(p.partners)
    )
  ) WITH CHECK (
    -- Users cannot update the core parameters (volunteer_id, hours, activity)
    volunteer_id = volunteer_id
    AND project_id = project_id
    AND hours_logged = hours_logged
    AND activity_description = activity_description
  );

-- Trigger Function to guarantee absolute immutability of logged metrics
CREATE OR REPLACE FUNCTION public.prevent_commitment_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Commitment logs are strictly immutable and cannot be deleted. Use a voiding log entry instead.';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ensure core ledger data is unchanged
    IF NEW.id <> OLD.id OR
       NEW.volunteer_id <> OLD.volunteer_id OR
       NEW.project_id <> OLD.project_id OR
       NEW.hours_logged <> OLD.hours_logged OR
       NEW.activity_description <> OLD.activity_description OR
       NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Core contribution metrics (hours, user, activity) are immutable. Changes are restricted to verification and voiding workflows.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_commitment_log_mutation
BEFORE UPDATE OR DELETE ON public.commitment_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_commitment_log_mutation();
```

### B. Airtight Frontend Route Guard (`src/components/layout/ProtectedRoute.tsx`)
Create this component to wrap sensitive routes in `src/App.tsx`.

```tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "@/lib/platform-data";
import { type UserRole, type Session } from "@/types/models";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchSession = async () => {
      try {
        const currentSession = await getSession();
        if (active) {
          setSession(currentSession);
        }
      } catch (err) {
        console.error("Failed to verify user session:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchSession();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm font-medium">
          Verifying security privileges...
        </div>
      </div>
    );
  }

  // Redirect to login if unauthenticated
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Redirect to unauthorized index or profile if role mismatch
  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={session.role === "admin" ? "/admin" : "/profile"} replace />;
  }

  return <>{children}</>;
};
```

### C. Self-Service Portfolio Hook & Workflow (`src/hooks/usePortfolio.ts`)
This custom React hook abstracts the portfolio lifecycle actions: creating drafts, updating drafts, and submitting them for admin review.

```typescript
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface PortfolioPayload {
  projectId?: string;
  title: string;
  description: string;
  rolePlayed: string;
  outcomes: string;
  mediaUrls: string[];
  isPublic: boolean;
}

export const usePortfolio = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveShowcase = async (payload: PortfolioPayload, entryId?: string) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication session required.");

      const record = {
        user_id: user.id,
        project_id: payload.projectId || null,
        title: payload.title,
        description: payload.description,
        role_played: payload.rolePlayed,
        outcomes: payload.outcomes,
        media_urls: payload.mediaUrls,
        is_public: payload.isPublic,
        status: "draft", // Saving forces status back to draft
      };

      let error;
      if (entryId) {
        ({ error } = await supabase
          .from("portfolio_entries")
          .update(record)
          .eq("id", entryId)
          .eq("user_id", user.id) // security boundary
          .eq("status", "draft")); // can only edit draft
      } else {
        ({ error } = await supabase
          .from("portfolio_entries")
          .insert(record));
      }

      if (error) throw error;

      toast({
        title: "Draft Saved Successfully",
        description: "Your showcase remains in draft and is not visible to the public.",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save portfolio entry.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitShowcaseForReview = async (entryId: string) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication session required.");

      const { error } = await supabase
        .from("portfolio_entries")
        .update({ status: "pending" })
        .eq("id", entryId)
        .eq("user_id", user.id)
        .or("status.eq.draft,status.eq.rejected"); // Allow submitting drafts or rejected revisions

      if (error) throw error;

      toast({
        title: "Showcase Submitted",
        description: "Your portfolio has been sent to the admin review queue.",
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit showcase.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { saveShowcase, submitShowcaseForReview, isSubmitting };
};
```
