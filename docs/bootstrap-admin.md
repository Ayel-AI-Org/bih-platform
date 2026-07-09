# Manual Admin Account Bootstrap Process

This document describes how to bootstrap the very first administrator account on a fresh database instance of the Bridge for Impact Hub (BIH) platform.

Since the `staff_invites` table requires a reference to an existing admin profile (`invited_by`), you cannot use the standard invite flow to create the first administrator. You must manually register an account via Supabase Auth and execute the SQL snippet below.

---

> [!CAUTION]
> This bootstrapping process must **only** be executed once to establish the initial administrator account. After the first admin is created, all subsequent administrators and staff members **must** be created using the official `staff_invites` UI or API flow.

---

## Steps to Bootstrap the First Admin

### Step 1: Sign Up via Supabase Auth
Register the email address that will be used for the first admin account. You can do this:
1. Via the Supabase Dashboard under **Authentication > Users > Add User**.
2. Or by calling `signUp` using the client SDK with the desired email and password.

Note the generated **User ID (UUID)** for the newly created user from the Supabase Authentication dashboard.

### Step 2: Execute the Bootstrapping SQL
Run the following SQL snippet once in the **Supabase SQL Editor**:

```sql
-- One-time Admin Bootstrapping Script
-- Replace 'USER_UUID_HERE', 'First Admin Name', and 'admin@example.com' with the actual user details.

INSERT INTO public.profiles (id, role, full_name, email, created_at)
VALUES (
  'USER_UUID_HERE'::uuid, 
  'admin'::public.user_role, 
  'First Admin Name', 
  'admin@example.com', 
  now()
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'::public.user_role;
```

### Step 3: Verify Admin Access
Log in via the `/login` route on the BIH platform using the registered admin credentials. You should be successfully redirected to the `/admin` dashboard.
