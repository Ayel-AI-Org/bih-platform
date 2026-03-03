# Bridge for Impact Hub (BIH) User Manual

This manual documents the full current BIH platform: features, user journeys, admin operations, AI behavior, environment setup, deployment, and troubleshooting.

---

## 1) Platform Overview

BIH is a web platform that connects:

- Volunteers
- NGOs / clubs / humanitarian organizations
- Donors / philanthropists
- Community members
- BIH administrators

Primary outcomes:

- Centralized registration and profile records
- Public project visibility by status
- Project suggestion intake and admin review
- Donation capture and tracking
- Media/article transparency channel
- Site-wide BIH AI assistant support

---

## 2) Current Feature Scope

### Implemented now

- Public pages and navigation
- Role-based registration (Volunteer, NGO, Donor)
- Login + session-based redirect behavior
- Projects listing + project details
- Suggest-project form with richer submission fields
- Admin dashboard with counts, tables, CSV exports, and review actions
- Donation page with Paystack Mobile Money checkout
- AI-assisted project text polishing on approved suggestions
- Site-wide BIH chatbot with resilient provider fallback
- Decision email edge function for approved/rejected suggestions

### Not yet implemented (known limitations)

- Dedicated role dashboards for volunteer/ngo/donor users after login
- Card payments (UI shows “coming soon”)
- Server-side payment verification webhook workflow

---

## 3) User Roles and Access

### Public visitor

Can access:

- `/`
- `/projects`
- `/projects/:projectId`
- `/suggest-project`
- `/donate`
- `/media`
- `/register` and role signup pages
- `/login`

No authentication required for reading projects/media and submitting suggestions/donations.

### Registered non-admin user (volunteer / ngo / donor)

- Can authenticate and maintain an account.
- After login, redirects to `/projects`.

### Admin user

- Must have `role = 'admin'` in `profiles`.
- After login, redirects to `/admin`.
- Can review suggestions, export data, and operate core workflows.

---

## 4) Routes and Pages

- Home: `/`
- Projects listing: `/projects`
- Project details: `/projects/:projectId`
- Register chooser: `/register`
- Volunteer signup: `/register/volunteer`
- NGO signup: `/register/ngo`
- Donor signup: `/register/donor`
- Login: `/login`
- Suggest project: `/suggest-project`
- Donate: `/donate`
- Media: `/media`
- Admin dashboard: `/admin`
- 404 page: unmatched route fallback

---

## 5) End-to-End Flows

## A) Registration flow

1. User chooses a role on `/register`.
2. User submits role-specific form.
3. System creates user in Supabase Auth.
4. System upserts `profiles` base record.
5. System writes role-specific row into one of:
   - `volunteer_profiles`
   - `ngo_profiles`
   - `donor_profiles`
6. User is redirected to `/login`.

Expected outcome:

- Record is available in admin dashboard exports.

## B) Login flow

1. User enters credentials on `/login`.
2. System authenticates with Supabase Auth.
3. System resolves role/name from `profiles`.
4. Redirect logic:
   - Admin → `/admin`
   - Non-admin → `/projects`

## C) Project browsing flow

1. Public user opens `/projects`.
2. System fetches from `projects`.
3. User filters by tabs:
   - Proposed
   - Ongoing
   - Completed
4. User opens details at `/projects/:projectId`.

## D) Project suggestion flow

1. Public user submits on `/suggest-project`.
2. System inserts into `project_suggestions` with status `pending`.
3. Admin reviews in `/admin`.
4. Admin decision:
   - `approved`: suggestion status updated and proposed project created in `projects`
   - `rejected`: status updated to `rejected`
5. Decision email function is invoked when configured.

## E) AI project polish flow (during approval)

When admin approves a suggestion:

1. App invokes `project-polish` edge function.
2. Polished title/description is used to create project (if available).
3. If AI fails, original suggestion text is used (graceful fallback).

## F) Donation flow

1. User opens `/donate`.
2. If arriving from project details, donation purpose is prefilled to that project.
3. User chooses payment method:
   - Mobile Money: active via Paystack inline checkout
   - Card: currently disabled (“coming soon”)
4. On successful Paystack callback, donation is recorded in `donations`.
5. `confirmation_email_status` is stored as `sent` in current MVP logic.

## G) Admin dashboard flow

Admin on `/admin` can:

- View summary cards for key datasets
- Inspect Volunteers / NGOs / Donors / Suggestions / Donations
- Export each dataset to CSV
- Approve/reject pending suggestions
- Trigger decision email sending on review

## H) Chatbot flow

BIH Assistant is available site-wide via floating chat button.

Provider sequence:

1. Gemini
2. Groq
3. OpenAI

If all providers fail, chatbot still returns a safe local fallback reply so users are not blocked.

---

## 6) Data Model and Storage

Primary tables:

- `profiles`
- `volunteer_profiles`
- `ngo_profiles`
- `donor_profiles`
- `projects`
- `project_suggestions`
- `donations`
- `media_articles`

Reference schema:

- `supabase/schema.sql`

Upgrade/fix scripts:

- `supabase/suggestion-upgrade.sql`
- `supabase/project-rls-fix.sql`
- `supabase/approved-suggestions-backfill.sql`

---

## 7) Security and Access Control

- Supabase Auth is used for authentication.
- Row Level Security (RLS) is enabled on core tables.
- Public read:
  - `projects`
  - `media_articles`
- Public insert:
  - `project_suggestions`
  - `donations`
- Admin read/update privileges on operational tables via `is_admin()` policy logic.

Important:

- Admin role is determined by `profiles.role = 'admin'`.

---

## 8) Edge Functions and AI/Email Behavior

### Functions in use

- `ai-chat-assistant`
- `project-polish`
- `suggestion-decision-email`

### `config.toml` behavior

- `ai-chat-assistant`: `verify_jwt = false`
- `project-polish`: `verify_jwt = false`
- `suggestion-decision-email`: `verify_jwt = true`

### Required secrets

Core:

- `RESEND_API_KEY` (for decision emails)
- `SUGGESTION_EMAIL_FROM` (sender identity)

AI providers (at least one):

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`

Optional model overrides:

- `GEMINI_MODEL`
- `GROQ_MODEL`
- `OPENAI_MODEL`

---

## 9) Environment Variables

Frontend `.env` values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYSTACK_PUBLIC_KEY`

Use `.env.example` as template and never commit real secrets.

---

## 10) Local Setup (Developer)

1. Create/select Supabase project.
2. Run schema in SQL Editor:
   - `supabase/schema.sql`
3. If upgrading an existing DB, run:
   - `supabase/suggestion-upgrade.sql`
   - `supabase/project-rls-fix.sql`
   - `supabase/approved-suggestions-backfill.sql` (when needed)
4. Create `.env` from `.env.example` and set values.
5. Install and run:
   - `npm install`
   - `npm run dev`
6. Build check:
   - `npm run build`

---

## 11) Deployment Runbook (Production)

1. Push code to GitHub.
2. Deploy Supabase edge functions:
   - `ai-chat-assistant`
   - `project-polish`
   - `suggestion-decision-email`
3. Ensure function secrets are configured in target project.
4. Deploy frontend (e.g., Vercel) with env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PAYSTACK_PUBLIC_KEY`
5. Post-deploy verification:
   - Signup/login works
   - Suggestion submit + admin review works
   - Approved suggestion creates project
   - Donation checkout records donation
   - Chatbot replies correctly

---

## 12) Admin Operating Checklist

Daily/regular operations:

1. Login to `/admin`.
2. Review pending suggestions.
3. Approve/reject with optional admin notes.
4. Confirm approved suggestions appear in Projects.
5. Export CSV snapshots for audit/reporting.
6. Monitor function logs for email/AI failures.

---

## 13) Troubleshooting Guide

### App fails at startup with Supabase env error

- Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

### Admin cannot create projects from approved suggestions

- Apply `supabase/project-rls-fix.sql`.

### Approved suggestions missing from Projects

- Run `supabase/approved-suggestions-backfill.sql` once.

### Suggestion fields (phone/org/category/budget/beneficiaries) missing

- Run `supabase/suggestion-upgrade.sql`.

### Chatbot replies with fallback too often

- Verify `GEMINI_API_KEY`, `GROQ_API_KEY`, and/or `OPENAI_API_KEY` in function secrets.
- Check provider quota/usage limits.
- Confirm `ai-chat-assistant` is deployed to correct project.

### Suggestion decision emails not delivered

- Verify `RESEND_API_KEY` and `SUGGESTION_EMAIL_FROM`.
- Check `suggestion-decision-email` deployment and logs.

### Donation errors on checkout

- Verify `VITE_PAYSTACK_PUBLIC_KEY`.
- Confirm Paystack script can load.

---

## 14) Operational Notes Worth Knowing

- Card payment is intentionally disabled right now (Mobile Money only).
- Chatbot is designed to avoid hard failure UX (local fallback reply always available).
- Project creation on approval attempts AI polish first, then falls back to original text.
- Keep `supabase/.temp` out of commits; it contains local CLI artifacts.

---

## 15) Recommended Next Enhancements

- Payment webhook verification + reconciliation dashboard
- Dedicated role dashboards after login
- Search/filter/pagination in admin tables
- Audit log trail for review actions
- Real confirmation/notification email templates for donations and account events
