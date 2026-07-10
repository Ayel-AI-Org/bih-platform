# Bridge for Impact Hub (BIH) User Manual

This manual documents the features, workflows, dashboard portals, role hierarchies, and troubleshooting steps for the Bridge for Impact Hub (BIH) platform.

---

## 1. Platform Overview

BIH is a central web portal connecting:
* **Volunteers**: Track hours, build portfolios, and earn progress badges.
* **Partner NGOs**: Propose blueprints, verify hours, and showcase local actions.
* **Donors & Philanthropists**: Track giving histories, print receipts, and monitor live project milestones.
* **General Public**: Search active projects, submit suggestions, and support initiatives.
* **Ecosystem Administrators**: Moderate registries, audit transactions, and manage projects.

---

## 2. Roles, Clearance Levels & Access Guards

The platform uses a role-based access guard system (`AuthGuards.tsx`) to authorize views:

| Role | Access Scope | Clearance Details |
| --- | --- | --- |
| **Public Visitor** | Public Pages | Accesses home, search projects, suggestions forms, and donation checkout. |
| **Volunteer** | `/dashboard/volunteer` | View total hours, log work times, submit showcase drafts, and inspect badges. |
| **NGO Partner** | `/dashboard/ngo` | Propose projects, edit NGO profiles, and verify active volunteer time logs. |
| **Donor Member** | `/dashboard/donor` | Print donation receipts, view giving totals, and check project milestone maps. |
| **Standard Admin** | `/admin` | Moderate registrations, review suggestions, and inspect ledger tables. Blocked from destructive deletes or overrides. |
| **Super Admin** | `/admin` | Unrestricted command center access, including role promotion grants, project deletions, and hours void overrides. |

---

## 3. Core Operational Portals

### A. Volunteer Dashboard
* **My Dashboard**: Shows verified hours, pending log approvals, current badge level, and recent activities.
* **Log Hours Form**: Volunteers select an active project, input hours worked, choose the date, and describe their tasks. Logs enter a `pending` state awaiting NGO coordinator verification.
* **Hours History Ledger**: An append-only historical log displaying verification statuses (Pending, Verified, Voided).
* **My Badges**: Visual rank trackers calculating total verified hours:
  * **Newcomer**: $0+$ hours
  * **Contributor**: $10+$ hours
  * **Champion**: $50+$ hours
  * **Impact Leader**: $150+$ hours
  * **Legend**: $500+$ hours
* **Portfolio Showcase**: Create work item drafts. Once verified, submit them to platform moderators to highlight contributions on public profiles.

### B. NGO Coordinator Portal
* **Dashboard Overview**: Displays active NGO project statistics and pending approval queue sizes.
* **Verify Hours Ledger**: NGOs view hour logs submitted by volunteers for their specific projects. Coordinators can approve logs (instantly updating volunteer hours and badges) or reject invalid logs.

### C. Donor Portal
* **Donation History**: Lists all successfully completed donations, with options to download and print transaction receipts.
* **Impact View Map**: An interactive tracker displaying how donation transactions correspond directly to live project milestones.

### D. Administrator Hub
* **User Management**: Admins approve or reject incoming registrations. Features a dedicated **"Admins & Staff"** tab to review administrators.
* **Role Promotions**:
  * Standard admins can promote users between volunteer, NGO, or donor roles, or appoint them to standard `admin` staff status.
  * Only a `super_admin` can grant or revoke `super_admin` privileges. Standard admins are blocked from editing super admin clearance levels.
* **Project Management**: Create, edit, and publish project blueprints. Destructive project deletion is restricted to `super_admin` accounts.
* **Hours Override Operations**: Standard admins review log streams, but the authority to void historical hours logs is restricted to `super_admin` accounts.
* **Donations Ledger**: Shows all transactions, with options for CSV exports and an interactive **Paystack Reconciliation** button to check database transactions against payment gateway API logs.

---

## 4. End-to-End Key User Journeys

### A. Dynamic Project Discovery
1. Public visitors browse the projects listing at `/projects`.
2. Users can switch tabs (Proposed, Ongoing, Completed) and type keywords into the **live search bar** to filter projects by title, description, or location.
3. Clicking a project details page reveals location parameters, partner profiles, milestones, and the **Active Volunteers (Team)** roster.

### B. Onboarding Spotlight System (Guided UI Tour)
1. On first login, a customized tour starts automatically.
2. The tour uses a high-density spotlight overlay (`box-shadow: 0 0 0 9999px rgba(0,0,0,0.65)`) to highlight relevant elements (e.g. navigation links or tabs).
3. The tooltip card positions itself responsively adjacent to the target (on the right for sidebars, below or above depending on viewport boundaries).
4. If an element is hidden or missing (e.g. mobile drawer is collapsed), the tour falls back to a centered modal layout to prevent crashing.
5. Users can click **"Skip Tour"** at any time. The dismissal state is saved to `localStorage` per role so the tour will not trigger again.

### C. Public Suggestions and AI Polish
1. Community members submit project proposals at `/suggest-project`.
2. Admins review pending proposals.
3. Upon approval, the application runs the `project-polish` serverless edge function. AI refines the description for clarity and style before publishing it as an ongoing project blueprint. If the AI model is offline, it falls back to the user's original text.
4. Decision email notifications are sent out to suggestion submitters automatically.

---

## 5. Troubleshooting Guidelines

### System crashes to a blank screen on runtime error
* **Resolution**: Wrap transitions or component mounts inside our global `ErrorBoundary`. If a crash occurs, a stylized error card with a **"Go to Safety"** reset trigger will guide the user back to safety.

### Tour tooltips overlap or cut off on small viewports
* **Resolution**: The positioning engine recalculates tooltips dynamically on window resize or scroll. If the sidebar menu collapses or drawer closes, the engine defaults to a centered overlay card.

### Paystack checkout failures
* **Resolution**: Check the public key in your configuration:
  * For sandbox testing, use a `pk_test_...` key.
  * For live payments, replace it with `pk_live_...` in your env settings. No changes to code files are required.

### Administrative actions disabled or missing
* **Resolution**: Verify that the logged-in administrator carries the `super_admin` role in the database. Actions like project deletion and hours overrides are hidden and blocked for standard staff users.
