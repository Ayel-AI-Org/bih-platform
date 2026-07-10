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

### Step 2: Apply Schema Upgrades
If initializing a fresh database, these upgrades are already folded into `schema.sql`. For incremental upgrades of existing DBs, run the following:
* `supabase/suggestion-upgrade.sql` (Enriches project suggestions structure).
* `supabase/project-rls-fix.sql` (Fixes milestone insert permissions).
* `supabase/approved-suggestions-backfill.sql` (Synchronizes suggestions to project tables).
* `supabase/production-reset.sql` (Idempotently adds the `super_admin` role to the enum list).

---

## 4. Deploying Supabase Edge Functions

The ecosystem features three serverless edge functions:
1. `ai-chat-assistant` (Site-wide assistant chatbot, handles multiple model fallbacks).
2. `project-polish` (AI description optimization during suggestion approvals).
3. `suggestion-decision-email` (Automated reviewer notifications).

### Step 1: Deploy Functions
Run these commands from your local machine using the Supabase CLI:
```bash
supabase functions deploy ai-chat-assistant --no-verify-jwt
supabase functions deploy project-polish --no-verify-jwt
supabase functions deploy suggestion-decision-email
```

### Step 2: Configure Function Secrets
In your Supabase project settings, define the following variables:
* **AI API Keys (provide at least one)**:
  * `GEMINI_API_KEY` (Recommended)
  * `GROQ_API_KEY`
  * `OPENAI_API_KEY`
* **Email Client Credentials**:
  * `RESEND_API_KEY` (Key from Resend)
  * `SUGGESTION_EMAIL_FROM` (Verified sender email address)

---

## 5. Production Clean-up & Reset Protocol

When moving from User Acceptance Testing (UAT) to clean production, run the clean-up script to clear user records and transactions without dropping schemas or settings configurations:
```sql
-- Run in Supabase SQL editor:
\i supabase/production-reset.sql
```
This truncates all user profiles, volunteer logs, portfolio items, milestones, projects, suggestions, and payment records cleanly.

---

## 6. Build Checks & Testing

Ensure that all routes and typings compile successfully:
```bash
# Run unit test checks
npm test

# Compile production bundle
npm run build
```
This generates a code-split static build directory under `/dist`.
