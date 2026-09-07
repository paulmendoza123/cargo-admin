# Admin Business Management Setup

## 1. Install the Supabase functions

In the Supabase SQL Editor, open a new blank query and run the complete
contents of:

`supabase/admin-business-management.sql`

The final result should be:

`ADMIN BUSINESS MANAGEMENT READY`

The migration is safe to run again. It creates the business status audit table
and three administrator-only functions for reading businesses, reading status
history, and changing account status.

The core business, booking, gallery, destination, cargo type, and rate tables
must already exist in the same Supabase project.

## 2. Start the admin portal

Keep the existing `.env.local` file, then run:

```bash
npm install
npm run dev
```

Sign in with an active administrator account and open **Businesses**.

## 3. Verify the live workflow

1. Confirm the page displays the real approved business account from Supabase.
2. Select **Manage** and confirm the logo, cover, contact details,
   destinations, cargo types, booking count, rates, and gallery count.
3. Choose **Suspend Business**, enter a clear reason, and confirm.
4. Refresh the page and confirm the status remains **Suspended** and the audit
   entry appears.
5. Open the customer app and confirm the suspended company is hidden from
   customer discovery and cannot receive a new booking.
6. Return to the admin portal, reactivate the business, and confirm it becomes
   visible in the customer app again.

## Security behavior

- Only an authenticated account accepted by `public.is_admin()` can call the
  administrator business functions.
- Browser clients do not receive direct access to the audit table.
- Suspension requires a reason of at least eight characters.
- Every status change records the old status, new status, administrator user
  ID, note, and timestamp.
- Rates, destinations, and services remain owner-managed; this page monitors
  them without providing unsafe direct edits.

## Validation

```bash
npm run lint
npm run build
```

