# Manual Admin Account Bootstrap Process

This document describes how to bootstrap the very first administrator or super administrator account on a fresh database instance of the Bridge for Impact Hub (BIH) platform.

Since standard admin invitation flows require an existing admin account to approve them, the very first account must be created manually via Supabase Auth and promoted using SQL.

---

> [!CAUTION]
> This bootstrapping process must **only** be executed once to establish the initial administrator account. After the first admin is created, all subsequent administrators, staff members, and super admins should be managed using the official Admin Dashboard portals.

---

## Steps to Bootstrap the First Admin

### Step 1: Sign Up via Supabase Auth
Register the email address that will be used for the first administrator account:
1. Go to your **Supabase Dashboard > Authentication > Users > Add User**.
2. Create the user account with email and password.
3. Note the generated **User ID (UUID)** for the newly created user.

### Step 2: Execute the Bootstrapping SQL
Run the appropriate SQL snippet in your **Supabase SQL Editor** depending on the desired clearance tier:

#### Option A: Promote to Super Administrator (Highest Clearance)
Use this option to establish the root account. Super Admins have destructive action overrides (deleting project blueprints, voiding logs):
```sql
-- One-time Super Admin Bootstrapping Script
-- Replace 'USER_UUID_HERE', 'First Super Admin', and 'superadmin@example.com' with the actual user details.

INSERT INTO public.profiles (id, role, full_name, email, created_at)
VALUES (
  'USER_UUID_HERE'::uuid, 
  'super_admin'::public.user_role, 
  'First Super Admin', 
  'superadmin@example.com', 
  now()
)
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin'::public.user_role;
```

#### Option B: Promote to Standard Administrator (Staff/Moderator)
Use this option to create standard moderators who can review registry applications but are blocked from deleting projects or voiding hours logs:
```sql
-- One-time Admin Bootstrapping Script
-- Replace 'USER_UUID_HERE', 'First Staff Name', and 'admin@example.com' with the actual user details.

INSERT INTO public.profiles (id, role, full_name, email, created_at)
VALUES (
  'USER_UUID_HERE'::uuid, 
  'admin'::public.user_role, 
  'First Staff Name', 
  'admin@example.com', 
  now()
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::public.user_role;
```

---

### Step 3: Verify Admin Access
Log in via the `/login` route on the BIH platform using the registered administrator credentials. You should be successfully redirected to the `/admin` dashboard.
* Standard Admins will see the user tables and suggestions, but destructive delete/void buttons will be hidden.
* Super Admins will see the complete admin layout, including active delete project and hours void override controls.
