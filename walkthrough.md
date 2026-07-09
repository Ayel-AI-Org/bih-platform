# Walkthrough: Authentication Flow Rebuild

We have successfully rebuilt the authentication flow from scratch. We replaced the legacy admin-only login constraint with a unified, role-based password login system for all roles (Volunteer, NGO, Donor, Admin).

---

## What Was Implemented

### 1. Unified Route Guards
* **Centralized Guards (`AuthGuards.tsx`):**
  * **`ProtectedRoute`**: Restricts dashboard access to authenticated users with approved status. Restricts user routes based on matched role types. Prevents non-approved users from viewing dashboard pages, redirecting them to `/pending`.
  * **`PublicRoute`**: Intercepts unauthenticated routes like `/login` or `/register` to redirect already-authenticated users back to their target dashboards or `/pending`.
  * **`PendingRoute`**: Only allows pending/rejected accounts on the `/pending` holding page, preventing approved members from returning to it.

### 2. Upgraded Pages (6 Auth Screens)
* **Screen 1 — Role Chooser (`/register`):** Refactored using BIH brand colors (navy secondary `#1E3A5F` and gold primary `#F59E0B`) with custom layout cards for Volunteers, NGOs, and Donors.
* **Screen 2a — Volunteer Registration (`/register/volunteer`):** Built with `react-hook-form` + `zod` schema verification. Includes multi-select skill tags, availability dropdowns, and handles sequential insertion into `profiles` and `volunteer_profiles`.
* **Screen 2b — NGO Registration (`/register/ngo`):** Built with `react-hook-form` + `zod` schema validation. Handles insertion into `profiles` (mapping organization name to full name) and `ngo_profiles`.
* **Screen 2c — Donor Registration (`/register/donor`):** Built with `react-hook-form` + `zod` schema validation. Includes donor type select and cause interests multi-select. Inserts records into `profiles` and `donor_profiles`.
* **Screen 3 — Login (`/login`):** Validated email/password sign-in. Resolves user roles and queries the corresponding profiles table for `approval_status`. Triggers tailored toast notifications on error states ("Invalid email or password", "Your account is pending approval", "Your account was not approved.").
* **Screen 4 — Pending Holding (`/pending`):** Clean page presenting user credentials (name and email) and holding text. Features a single **Sign out** button and restricts header/footer nav links.
* **Screen 5 — Forgot Password (`/forgot-password`):** Collects email and triggers recovery link mapping to `https://www.bridgeforimpacthub.org/reset-password`. Implements standard secure validation (always reports success to protect email privacy).
* **Screen 6 — Reset Password (`/reset-password`):** Input field verifying password length (minimum 8 characters) and matching values. Triggers `supabase.auth.updateUser` to save the new password.

### 3. Dashboard Placeholders
* Created three clean placeholders rendering simple `<h1>` headings to prevent SPA route mapping compilation errors:
  * `VolunteerDashboardPlaceholder.tsx` (`/dashboard/volunteer`)
  * `NgoDashboardPlaceholder.tsx` (`/dashboard/ngo`)
  * `DonorDashboardPlaceholder.tsx` (`/dashboard/donor`)

### 4. Router Mappings (`App.tsx`)
* Integrated the new routing structure under the site layouts, wrapped in `PublicRoute`, `PendingRoute`, and `ProtectedRoute` guards as required.

---

## Verification & Build Results

We executed the Vite compiler check to ensure full integration and strict typing compliance across all new forms and guard files:
* **Command run:** `npm run build`
* **Status:** Passed successfully with zero errors.
