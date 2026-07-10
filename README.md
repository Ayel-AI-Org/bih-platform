# Bridge for Impact Hub (BIH) – Digital Impact Ecosystem

Welcome to the official source repository for the **Bridge for Impact Hub (BIH)** platform.

BIH is a central non-governmental organization (NGO) and community hub dedicated to connecting passionate volunteers, localized partner NGOs, humanitarian clubs, and philanthropic donors. Together, we make community change visible, actionable, and lasting.

---

## 💻 About the Platform

The BIH platform is a unified web application designed to track community development projects, verify humanitarian contributions, capture charitable funding, and showcase individual volunteer achievements.

By bringing stakeholders together, BIH establishes a transparent, metrics-driven ecosystem that coordinates localized impact efforts across multiple key pillars:

### 1. Volunteers (Humanitarian Contributors)
* **Log Contributions**: Report and log volunteer hours completed on registered community projects.
* **Impact Portfolio**: Build a public-facing portfolio showcasing verified achievements, skills, and outcomes.
* **Progression Tiers**: Earn structured badges (Newcomer, Contributor, Champion, Leader, Legend) as verified hours increase.

### 2. Partner NGOs (Localized Clubs & Foundations)
* **Project Blueprints**: Design, publish, and manage project lifecycles.
* **Hours Verification**: Act as coordinators to approve, void, or audit time logs submitted by active volunteers.
* **Ecosystem Visibility**: Highlight local achievements to attract donors and volunteers.

### 3. Donors & Philanthropists (Financial Sponsors)
* **Secure Checkout**: Support community initiatives using card or mobile money channels powered by Paystack.
* **Impact Mapping**: Review an interactive timeline mapping transaction histories directly to live project milestones.
* **Printable Receipts**: Download official receipts for tax deductions or record-keeping.

### 4. Platform Administrators (Ecosystem Coordinators)
* **Review Pipelines**: Approve or reject project suggestions submitted by the general public.
* **Account Moderation**: Validate and queue volunteer, NGO coordinator, and donor registries.
* **Financial Auditing**: Export transaction records and reconcile ledger entries with the payment processor logs.

---

## 🌐 Public-Facing Features

* **Projects Gallery**: Browse proposed, ongoing, and completed community projects with dynamic keyword search and status tabs.
* **Intake Suggestions**: Community members can submit neighborhood improvement blueprints directly without logging in.
* **AI Chat Assistant**: A resilient, site-wide chatbot trained on BIH policies to match volunteers to projects and answer community inquiries.
* **Media & Stories**: Access transparent impact reports, news, and success stories published by the team.

---

## 📚 Repository Documentation Index

Since this is the platform source repository, developers and operations staff should refer to the following documentation sections:

* 🛠️ **Developer Setup & Deployments**: See [docs/setup.md](docs/setup.md) for local installation, environment variables, Supabase database schemas, and Serverless Edge Functions configuration.
* 📖 **Product & Operations Manual**: See [USER_MANUAL.md](USER_MANUAL.md) for step-by-step user journeys, dashboard features, administrative checklists, and troubleshooting guidelines.
* 🔑 **Administrator Bootstrapping**: See [docs/bootstrap-admin.md](docs/bootstrap-admin.md) to initialize the very first `super_admin` or `admin` account on fresh database deployments.
