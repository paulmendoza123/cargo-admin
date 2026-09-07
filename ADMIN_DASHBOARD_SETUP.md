# Live Admin Dashboard Setup

## 1. Install the dashboard function

In the Supabase SQL Editor, open a new blank query and run the complete
contents of:

`supabase/admin-dashboard.sql`

The final result should be:

`ADMIN DASHBOARD READY`

The migration is safe to run again. It creates one administrator-only read
function and does not modify or delete existing application, business, user,
booking, verification, or sponsorship records.

The earlier core, sponsorship, customer verification, and business-management
tables must already exist in the same Supabase project.

## 2. Verify the dashboard

1. Start the portal with `npm run dev` and sign in as an active administrator.
2. Open **Dashboard** and select **Refresh**.
3. Confirm the business, pending application, active business, customer,
   booking, and ID-review values match Supabase.
4. Confirm **Pending Applications** and **Registered Businesses** contain live
   records rather than sample companies.
5. Select the bell in the top bar. It should show only queues that currently
   need administrator review.
6. Select a bell item and confirm it opens Applications, Sponsored Listings,
   or Users as appropriate.
7. Review one pending item and confirm the related dashboard count and badge
   update automatically.

## Live values included

- total, active, and suspended businesses;
- pending business applications;
- customer and business account counts;
- pending sponsorship payment reviews;
- pending customer identity verifications;
- total bookings;
- five newest pending applications;
- three newest active businesses.

## Security

- The browser calls `public.get_admin_dashboard()` using the signed-in user.
- The function refuses access unless `public.is_admin()` accepts the user.
- The function returns only the aggregate and queue data needed by the admin
  interface.
- It performs no data mutations.

## Validation

```bash
npm run lint
npm run build
```

