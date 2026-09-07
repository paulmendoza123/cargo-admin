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

## Validation

```bash
npm run lint
npm run build
```
