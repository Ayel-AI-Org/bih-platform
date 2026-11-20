# BIH Platform Technical Setup & Deployment Guide

This guide details the technical specifications, environment configuration, database setup, and deployment instructions for developers and administrators of the Bridge for Impact Hub (BIH) platform.

---

## 1. Technical Stack

* **Frontend**: Vite + React + TypeScript
* **Routing**: React Router DOM (Lazy-Loaded)
* **Styling**: Tailwind CSS + shadcn/ui components
* **State & Query**: Tanstack React Query
* **Database & Auth**: Supabase (Postgres Database, GoTrue Auth, Row Level Security)
* **Payment Processor**: Paystack Inline Checkout (Card & Mobile Money)

---

## 2. Local Development Environment Setup

### Prerequisites
* Node.js (v18+)
* npm or Bun package manager

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in the respective values:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_token...
```
*(For production launch, change VITE_PAYSTACK_PUBLIC_KEY to `pk_live_...` with no other code changes).*

### Step 3: Run the Development Server
```bash
npm run dev
```
The application will launch on your local host (usually `http://localhost:5173`).

---

## 3. Supabase Database Configuration

### Step 1: Execute Schema
1. Open your Supabase Dashboard SQL Editor.
2. Run the SQL script from [supabase/schema.sql](../supabase/schema.sql) to set up all tables, custom enums, indexes, and Row Level Security (RLS) policies.

### Step 2: Apply Schema Upgrades & Storage Configuration
If initializing a fresh database, these upgrades are already folded into `schema.sql`. For incremental upgrades of existing DBs, run the following in your Supabase SQL Editor:
* `supabase/storage-policy-and-mime-fix.sql` (Configures Supabase Storage bucket `bih-media` with allowed MIME types for Images, PDFs, and Videos; sets 25 MB size limits; applies RLS policies; and adds `video_url` column to `media_articles`).
* `supabase/suggestion-upgrade.sql` (Enriches project suggestions structure).
* `supabase/project-rls-fix.sql` (Fixes milestone insert permissions).
* `supabase/approved-suggestions-backfill.sql` (Synchronizes suggestions to project tables).
* `supabase/production-reset.sql` (Idempotently adds the `super_admin` role to the enum list).

### Step 3: Storage Bucket Policy & MIME-Type Verification
Supabase Storage enforces MIME-type restrictions at the bucket layer. If `bih-media` was created through the Supabase Dashboard with restrictive MIME settings, attempting to upload PDFs (`application/pdf`) will fail with HTTP 415 (`StorageApiError: mime type application/pdf is not supported`).
To verify or fix this:
1. Open the Supabase Dashboard > Storage > Buckets > `bih-media`.
2. Under Bucket Settings, ensure **Allowed MIME types** includes `application/pdf` or is set according to `supabase/storage-policy-and-mime-fix.sql`.
3. Set **Max file size limit** to `25MB` (26,214,400 bytes).

---

## 4. Deploying Supabase Edge Functions

The ecosystem features serverless edge functions for asynchronous tasks, AI assistance, and transactional notifications:
1. `registration-decision-email` (Dispatches account approval or rejection emails to volunteers, NGOs, and donors upon admin review).
2. `suggestion-decision-email` (Notifies community members when their project blueprints are approved or rejected).
3. `suggestion-confirmation` (Sends immediate receipt confirmation when a suggestion is submitted).
4. `account-deletion-email` (Sends confirmation when an account is removed).
5. `paystack-webhook` (Listens for asynchronous Paystack transaction confirmations).
6. `ai-chat-assistant` (Site-wide assistant chatbot, handles multiple model fallbacks).
7. `project-polish` (AI description optimization during suggestion approvals).

### Step 1: Deploy Functions
Run these commands from your local machine using the Supabase CLI:
```bash
supabase functions deploy ai-chat-assistant --no-verify-jwt
supabase functions deploy project-polish --no-verify-jwt
supabase functions deploy registration-decision-email
supabase functions deploy suggestion-decision-email
supabase functions deploy suggestion-confirmation
supabase functions deploy account-deletion-email
supabase functions deploy paystack-webhook --no-verify-jwt
```

### Step 2: Configure Function Secrets
In your Supabase project settings (or via `supabase secrets set`), define the following environment variables:
* **AI API Keys (provide at least one)**:
  * `GEMINI_API_KEY` (Recommended)
  * `GROQ_API_KEY`
  * `OPENAI_API_KEY`
* **Email Client Credentials (Resend)**:
  * `RESEND_API_KEY` (API key from Resend dashboard)
  * `REGISTRATION_EMAIL_FROM` (Verified sender email address for user approvals, e.g. `BIH <notifications@yourdomain.org>`)
  * `SUGGESTION_EMAIL_FROM` (Verified sender email address for suggestion reviews)
  * `SITE_URL` (Public application URL, e.g. `https://bridgeforimpacthub.org`)
* **Payment Processor (Paystack)**:
  * `PAYSTACK_SECRET_KEY` (Secret key from Paystack dashboard)

---

## 5. Supabase Auth Email Templates

### Password Recovery ("Reset Password")
In Supabase Dashboard > Authentication > Email Templates > Reset Password, configure the reset link using the direct token hash query format:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your account:</p>
<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```
*Note: This PKCE-compatible format ensures password reset tokens resolve cleanly even if users open the email link in a different browser, incognito window, or embedded mobile email client.*

---

## 6. Social Media & External Channels

* **Linktree Hub**: `https://linktr.ee/BridgeforImpact_Hub` (Primary landing page aggregating all social channels)
* **Instagram / Social Handle**: `@bridgeforimpact_hub`
* Displayed tastefully across the global footer and `/media` updates hub.

---

## 7. Production Clean-up & Reset Protocol

When moving from User Acceptance Testing (UAT) to clean production, run the clean-up script to clear user records and transactions without dropping schemas or settings configurations:
```sql
-- Run in Supabase SQL editor:
\i supabase/production-reset.sql
```
This truncates all user profiles, volunteer logs, portfolio items, milestones, projects, suggestions, and payment records cleanly.

---

## 8. Build Checks & Testing

Ensure that all routes and typings compile successfully:
```bash
# Run unit test suite
npm test

# Compile production bundle
npm run build
```
This generates a code-split static build directory under `/dist`.
