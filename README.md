# CargoTrackPH Admin Portal

React, TypeScript, Vite, and Supabase administrator portal for CargoTrackPH.

## Local setup

1. Copy the required environment variables into `.env.local`:

   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

2. Install dependencies and start the portal:

   ```bash
   npm install
   npm run dev
   ```

3. Use a Supabase Auth account whose `profiles` row has `role = 'admin'` and
   `account_status = 'active'`.

For the first production administrator, password-recovery setup, required SQL
order, Vercel variables, and deployment checklist, follow
[ADMIN_PRODUCTION_DEPLOYMENT.md](ADMIN_PRODUCTION_DEPLOYMENT.md). The portal does
not use or expose a Supabase service-role key.

## Sponsorship workflow

The Sponsored Listings page reads live requests submitted by the Expo business
app. It supports:

- payment receipt review through short-lived signed URLs;
- approve/reject actions through administrator-only RPCs;
- sponsored placement enable/disable controls;
- editable package name, duration, price, description, and availability;
- editable GCash checkout settings;
- live pending-request badge in the sidebar.

Run [supabase/admin-sponsorship-workflow.sql](supabase/admin-sponsorship-workflow.sql)
once in the same Supabase project before opening the page. The mobile
`sponsorship-mobile-workflow.sql` migration must already be installed.

Existing requests retain their submitted package name, duration, and price
snapshots when package settings are edited.

## Business management

The Businesses page reads approved company accounts directly from Supabase. It
includes:

- real business branding and contact information;
- live destination, cargo type, rate, booking, and gallery counts;
- search, Active/Suspended filters, refresh, loading, and error states;
- administrator-only suspend/reactivate actions;
- a permanent audit history with the reason and timestamp for every status
  change.

Run [supabase/admin-business-management.sql](supabase/admin-business-management.sql)
once before opening the page. See
[ADMIN_BUSINESS_MANAGEMENT_SETUP.md](ADMIN_BUSINESS_MANAGEMENT_SETUP.md) for the
test checklist and security behavior.

## Live dashboard

The Dashboard and shared top-bar review queue now use live Supabase data. The
dashboard shows real platform totals, pending applications, recently approved
businesses, booking totals, sponsorship reviews, and customer ID reviews. The
Applications sidebar badge is live, and each bell item opens the matching admin
review page.

Run [supabase/admin-dashboard.sql](supabase/admin-dashboard.sql) once before
opening the Dashboard. See
[ADMIN_DASHBOARD_SETUP.md](ADMIN_DASHBOARD_SETUP.md) for the verification
checklist.

## Global admin search

The top-bar search is connected to live Supabase records across Businesses,
Applications, Users, and Sponsored Listings. Selecting a result opens the
correct page and carries the result code or email into that page's existing
search filter. Broad sponsorship matches are grouped per business, while exact
request-code and payment-reference searches still return individual requests.

Run [supabase/admin-global-search.sql](supabase/admin-global-search.sql) once
before using global search. See
[ADMIN_GLOBAL_SEARCH_SETUP.md](ADMIN_GLOBAL_SEARCH_SETUP.md) for coverage,
security limits, and the test checklist.

## Admin users management

The Users page loads customer and business accounts through administrator-only
database functions. Account status changes and customer identity reviews are
recorded in a unified administrative activity timeline. Customer ID images stay
inside the private Storage bucket and use short-lived preview links.

Run [supabase/admin-users-management.sql](supabase/admin-users-management.sql)
once before opening the Users page. See
[ADMIN_USERS_MANAGEMENT_SETUP.md](ADMIN_USERS_MANAGEMENT_SETUP.md) for the
security behavior and end-to-end test checklist.

## Validation

```bash
npm run lint
npm run build
```
