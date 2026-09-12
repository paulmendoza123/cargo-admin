-- CargoTrackPH: durable delivery log for business approval emails.
-- Run once in the Supabase SQL Editor before deploying the
-- send-business-approval-email Edge Function. Safe to run more than once.

create table if not exists public.business_approval_email_deliveries (
  application_id uuid primary key
    references public.business_applications(id) on delete cascade,
  recipient_email text not null,
  delivery_status text not null default 'processing',
  attempts integer not null default 1,
  provider_message_id text,
  last_error text,
  requested_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_approval_email_delivery_status_check
    check (delivery_status in ('processing', 'sent', 'failed')),
  constraint business_approval_email_attempts_check
    check (attempts > 0),
  constraint business_approval_email_recipient_check
    check (recipient_email = lower(btrim(recipient_email)))
);

alter table public.business_approval_email_deliveries enable row level security;

revoke all on table public.business_approval_email_deliveries
  from anon, authenticated;

comment on table public.business_approval_email_deliveries is
  'Server-only delivery log used to make business approval emails idempotent.';

