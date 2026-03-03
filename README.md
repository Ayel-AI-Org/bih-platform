# Bridge for Impact Hub (BIH) – Phase 1

Front-facing web platform for BIH to connect volunteers, NGOs, donors, and the public.

## Start Here

- Product/operator manual: [USER_MANUAL.md](USER_MANUAL.md)
- Backend schema and policies: [supabase/schema.sql](supabase/schema.sql)

## Tech Stack

- Vite + React + TypeScript
- React Router
- Tailwind CSS + shadcn/ui

## Run Locally

```sh
npm install
npm run dev
```

## Supabase Backend Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run [supabase/schema.sql](supabase/schema.sql).
3. Copy [.env.example](.env.example) to `.env` and set:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
	- `VITE_PAYSTACK_PUBLIC_KEY`
4. In Supabase Auth settings:
	- Turn off email confirmation for easiest local testing (optional)
	- Create an admin user in Auth (or register one through app)
5. Promote admin user by setting role in SQL:

```sql
update profiles
set role = 'admin'
where email = 'admin@bih.org';
```

6. If your DB already exists, run [supabase/suggestion-upgrade.sql](supabase/suggestion-upgrade.sql) to add richer project-suggestion review fields.
7. If some already-approved suggestions do not appear under projects, run [supabase/approved-suggestions-backfill.sql](supabase/approved-suggestions-backfill.sql).
8. Deploy the decision email edge function:
	- `supabase functions deploy suggestion-decision-email`
	- Set function secrets:
		- `RESEND_API_KEY`
		- `SUGGESTION_EMAIL_FROM` (e.g. `BIH <no-reply@yourdomain.com>`)
9. Deploy AI edge functions:
	- `supabase functions deploy project-polish`
	- `supabase functions deploy ai-chat-assistant`
	- Ensure [supabase/config.toml](supabase/config.toml) is applied so public chatbot invoke works (`verify_jwt = false` for AI functions)
	- Set function secret (choose one provider):
		- `GEMINI_API_KEY` (recommended if you already have Gemini)
		- `GROQ_API_KEY` (recommended quick alternative)
		- or `OPENAI_API_KEY`
	- Optional model overrides:
		- `GEMINI_MODEL`
		- `GROQ_MODEL`
		- `OPENAI_MODEL`

Production build:

```sh
npm run build
```

## Implemented Phase 1 Features

### Public Pages

- Home: `/`
- Projects listing: `/projects`
- Project details: `/projects/:projectId`
- Project suggestion form: `/suggest-project`
- Donation page: `/donate`
- Media/articles: `/media`
- AI chatbot assistant is available site-wide via floating chat button

### Registration & Login

- Registration chooser: `/register`
- Volunteer sign-up: `/register/volunteer`
- NGO sign-up: `/register/ngo`
- Donor sign-up: `/register/donor`
- Login: `/login`

### Admin Hub

- Dashboard: `/admin`
- View and export volunteers, NGOs, donors, suggestions, donations
- Approve/reject project suggestions (approved items become proposed projects)
- Admin decision emails are sent to project submitters (via Supabase edge function)
- Approved project descriptions are polished by AI before publishing (with fallback to original text)

## Demo Admin Credentials

- Email: `admin@bih.org`
- Password: `Admin@123`

## Data Storage (Current MVP)

- Phase 1 now uses Supabase (Postgres + Auth + RLS) for production-style backend flows.
- `projects` and `media_articles` are public-read tables.
- Registration, suggestions, donations, and admin dashboard datasets are stored in Supabase tables.

## Notes

- Donation “auto-confirmation email” is currently represented as a stored status (`sent`) in DB mode.
- Lint currently reports a few pre-existing scaffold issues in shared UI files unrelated to this Phase 1 implementation.
