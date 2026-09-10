# CargoTrackPH Admin Production Deployment

This portal uses Supabase Auth and administrator-only database functions. The
browser must receive only the Supabase project URL and publishable key. Never
place a service-role key in Vite, GitHub, or Vercel client environment variables.

## 1. Install the database functions

Run the SQL files below in the same Supabase project used by the mobile app.
Install the mobile application's base tables and migrations first, then run:

1. `supabase/admin-business-management.sql`
2. `supabase/admin-sponsorship-workflow.sql`
3. `supabase/admin-users-management.sql`
4. `supabase/admin-dashboard.sql`
5. `supabase/admin-global-search.sql`

Each admin function checks `public.is_admin()`, uses a fixed search path, revokes
access from `public` and `anon`, and grants execution only to authenticated users.

## 2. Create the first administrator

1. Create the intended administrator through Supabase Authentication or the
   regular email/password signup flow.
2. Confirm the email address.
3. Open `supabase/bootstrap-first-admin.sql`.
4. Replace `REPLACE_WITH_ADMIN_EMAIL` with the exact confirmed email.
5. Run the complete script once in the Supabase SQL Editor.

The bootstrap refuses to continue if an administrator already exists. Do not add
a UI button that lets a user promote their own role.

## 3. Configure password recovery

In Supabase Dashboard, open **Authentication > URL Configuration**. Add these
redirect URLs:

- `https://cargo-admin-theta.vercel.app/reset-password`
- `http://localhost:5173/reset-password`

Replace the production host if the Vercel project uses a different canonical
domain. Password-reset links are accepted only when they resolve to an active
administrator profile.

## 4. Configure Vercel

Set these variables for Production, Preview, and Development as appropriate:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` or any secret admin key to this frontend.

## 5. Deploy the correct branch

The production-ready Supabase implementation is currently on the
`customer-verification` branch. The older `main` branch still contains the demo
login. Review and merge `customer-verification` into `main`, push it to GitHub,
and confirm that Vercel deploys the new `main` commit.

## 6. Production smoke test

- A normal customer or business account is rejected by the Admin Portal.
- An active administrator can sign in and refresh without losing the session.
- Forgot Password sends a recovery email and the link opens `/reset-password`.
- The new password works and the used recovery session is signed out.
- Pending business applications and customer IDs load and can be reviewed.
- Business suspension/reactivation and user suspension/reactivation are audited.
- Sponsorship payment receipts use short-lived links and review actions persist.
- Dashboard totals, notification queue, and global search return live records.
- No service-role key appears in browser source, Vercel client variables, or Git.
