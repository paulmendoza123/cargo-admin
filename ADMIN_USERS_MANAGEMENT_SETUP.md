# Admin Users Management Setup

## 1. Install the secure workflow

In the Supabase SQL Editor, open a new blank query and run the complete
contents of:

`supabase/admin-users-management.sql`

The final result should be:

`ADMIN USERS MANAGEMENT READY`

The migration is safe to run again. It preserves existing customer identity
records and does not make the private `customer-ids` bucket public.

## 2. Verify account management

1. Start the admin portal with `npm run dev` and sign in as an administrator.
2. Open **Users** and confirm customer and business accounts load.
3. Open a test customer and select **Disable Account**.
4. Confirm the status changes to **Disabled** and the activity list records the
   administrator action.
5. Select **Activate Account** and confirm the account and activity update.
6. Do not use the administrator's own account as the test target.

## 3. Verify customer ID review

1. Open a customer with a pending identity document.
2. Confirm the private image preview loads and is not a permanent public URL.
3. Approve the ID and confirm its status changes to **Verified**.
4. For rejection testing, enter a reason containing at least eight characters.
5. Confirm the review appears in **Administrative activity**.
6. Sign in to the customer app and confirm the verification notification and
   updated Profile status appear.

## Security behavior

- All data and mutation functions require an authenticated administrator and
  re-check `public.is_admin()` inside the database.
- The Users page no longer directly queries `profiles`, `businesses`, or
  `customer_identity_documents`.
- Identity previews use five-minute signed URLs.
- The `customer-ids` bucket remains private; administrators receive read-only
  access through a Storage policy.
- Audit tables have RLS enabled and no direct browser privileges.
- Administrators cannot change their own administrator account through the
  user-management function.
- Rejection reasons are trimmed, required, and limited to 500 characters.

## Validation

```bash
npm run lint
npm run build
```
