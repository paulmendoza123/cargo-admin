# Registration Fee and Premium Listings Setup

## What this release changes

- Business documents are approved first.
- If the registration fee is enabled, approval creates a locked payment record instead of activating the business.
- The business pays the configured one-time fee and uploads a receipt.
- The administrator verifies the receipt; only then is the existing business activation workflow called.
- Customer and business-facing labels now say **Premium Listings**.
- Default Premium packages are seeded once: Weekly (7 days / PHP 299), Monthly (30 days / PHP 999), and Annual (365 days / PHP 9,999).
- Administrators may edit the fee, payment destination, package price, duration, description, and availability. Existing requests retain their original amount snapshots.

## Supabase

1. Back up the production database.
2. In Supabase SQL Editor, run `supabase/business-registration-and-premium.sql` once.
3. Confirm the final result is `BUSINESS REGISTRATION FEE AND PREMIUM LISTINGS READY`.
4. In the admin portal, open **Business Applications → Registration Fee**.
5. Enter the real payment account details, keep the amount at PHP 199 (or use the client-approved price), enable the fee, and save.
6. Open **Premium Listings → Packages & payment** to verify the Weekly, Monthly, and Annual packages.

The SQL is idempotent. Premium defaults are seeded only once so running it again does not overwrite later administrator price changes.

## Required testing sequence

1. Register a new business account and submit documents.
2. In Admin → Business Applications, open it and select **Approve Documents**.
3. In the business app, open Registration Status. Verify the locked fee and payment destination.
4. Upload a receipt and transaction reference.
5. In Admin → Business Applications, open the same application, view the receipt, then select **Approve Payment & Activate**.
6. Verify the business can open the Business Portal and is visible to customers.
7. Submit a Premium Listing request and verify its package price snapshot remains unchanged after editing the package price in Admin.

## Safety notes

- Never place a Supabase service-role key in the mobile or Vite client.
- Registration and Premium receipts are stored in private buckets.
- Do not manually mark an unpaid application `approved` in the database.
- The internal database names still use `sponsorship_*` for backward compatibility; this is intentional.
