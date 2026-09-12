# CargoTrackPH Business Approval Email Setup

This feature sends one branded transactional email when a business becomes
fully approved. Approval remains successful if the email provider is
temporarily unavailable, and an administrator can retry from the approved
application modal.

## 1. Brevo sender and API key

Create and verify the CargoTrackPH sender in Brevo. Generate a Brevo API key
dedicated to Supabase. Never commit or paste the API key into frontend code.

## 2. Supabase Edge Function secrets

In Supabase Dashboard, open **Edge Functions > Secrets** and add:

```text
BREVO_API_KEY=<Brevo API key>
BREVO_SENDER_EMAIL=cargotrackph.support@gmail.com
BREVO_SENDER_NAME=CargoTrackPH
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions automatically.

## 3. Apply the delivery-log migration

Open the Supabase SQL Editor and run:

```text
supabase/business-approval-email.sql
```

The log is server-only and prevents duplicate approval emails.

## 4. Deploy the Edge Function

With the project linked in the Supabase CLI:

```bash
npx supabase functions deploy send-business-approval-email
```

The function requires a signed-in administrator JWT. Do not deploy it with
JWT verification disabled.

## 5. Test

1. Submit a new business application from a real test account.
2. Approve its documents in the admin portal.
3. Submit and approve the registration payment.
4. Confirm the success message says the approval email was sent.
5. Confirm the recipient receives the branded CargoTrackPH email.
6. Open the approved application and click **Send approval email**. The
   duplicate guard should report that the message was already sent.

To retry an actual failed delivery, use **Send approval email** on the approved
application. Failed attempts are recorded in
`public.business_approval_email_deliveries` for server-side troubleshooting.

