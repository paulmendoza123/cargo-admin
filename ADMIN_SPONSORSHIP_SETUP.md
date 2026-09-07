# Admin Sponsorship Setup

## 1. Install the database access layer

In the Supabase SQL Editor, open a new blank query and run the complete contents
of:

`supabase/admin-sponsorship-workflow.sql`

Expected result:

`ADMIN SPONSORSHIP WORKFLOW READY`

This migration adds administrator-only read functions and a private receipt
viewing policy. It does not change or delete existing sponsorship requests.

## 2. Run the admin portal

Keep the existing `.env.local` values, then run:

```bash
npm install
npm run dev
```

Log in with an active administrator account and open **Sponsored Listings**.
The pending request from the mobile app should appear automatically.

## 3. Test the review flow

1. Open the pending request.
2. Select **Open payment receipt** and verify the submitted image.
3. Compare the transaction reference and requested amount.
4. Check the review confirmation.
5. Select **Approve & activate**.
6. Confirm that the request changes to **Active** and receives start/end dates.
7. Open the customer mobile app and confirm that the company is marked
   **Sponsored** and sorted ahead of ordinary matching companies.

Use **Reject** instead when the receipt or reference is invalid. The rejection
reason becomes visible to the business owner.

## 4. Edit packages or payment details

Open **Packages & payment** inside Sponsored Listings.

- Package edits affect only future requests. Submitted requests keep their
  original name, duration, and price snapshots.
- Disabling a package hides it from new mobile requests without deleting its
  history.
- Disabling GCash checkout blocks new sponsorship submissions until it is
  enabled again.

## 5. Deploy

After local testing:

```bash
npm run lint
npm run build
git add .
git commit -m "Connect admin sponsorship workflow"
git push
```

If Vercel is connected to the repository, the push will trigger a new
deployment. Confirm that the Vercel project still has the same
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables.
