-- CargoTrackPH: business registration fee and Premium Listings rollout.
-- Run after the existing business application and sponsorship workflows.
-- Safe to run more than once. Existing internal sponsorship names are preserved
-- so current mobile/admin integrations and historical records keep working.

begin;

create table if not exists public.business_registration_settings (
  id smallint primary key default 1,
  fee_enabled boolean not null default false,
  fee_amount numeric(12, 2) not null default 199.00,
  payment_method text not null default 'GCash',
  account_name text not null default '',
  account_number text not null default '',
  instructions text,
  payment_deadline_days integer not null default 7,
  premium_defaults_initialized boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint business_registration_settings_singleton check (id = 1),
  constraint business_registration_fee_amount_check
    check (fee_amount >= 0 and fee_amount <= 1000000),
  constraint business_registration_deadline_check
    check (payment_deadline_days between 1 and 90)
);

insert into public.business_registration_settings (id, fee_amount)
values (1, 199.00)
on conflict (id) do nothing;

alter table public.business_applications
  add column if not exists documents_approved_at timestamptz,
  add column if not exists documents_approved_by uuid
    references auth.users(id) on delete set null,
  add column if not exists registration_fee_due_at timestamptz;

create table if not exists public.business_registration_payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique
    references public.business_applications(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  amount_snapshot numeric(12, 2) not null,
  payment_method_snapshot text not null,
  account_name_snapshot text not null,
  account_number_snapshot text not null,
  instructions_snapshot text,
  payment_reference text,
  payment_proof_path text,
  status text not null default 'required',
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_registration_payment_amount_check
    check (amount_snapshot >= 0 and amount_snapshot <= 1000000),
  constraint business_registration_payment_status_check
    check (status in ('required', 'pending', 'approved', 'rejected', 'cancelled')),
  constraint business_registration_payment_reference_check
    check (payment_reference is null or char_length(payment_reference) between 3 and 100)
);

create index if not exists business_registration_payments_status_idx
  on public.business_registration_payments (status, submitted_at desc);
create index if not exists business_registration_payments_applicant_idx
  on public.business_registration_payments (applicant_id, created_at desc);

alter table public.business_registration_settings enable row level security;
alter table public.business_registration_payments enable row level security;

revoke all on table public.business_registration_settings
  from public, anon, authenticated;
revoke all on table public.business_registration_payments
  from public, anon, authenticated;

create or replace function public.get_public_business_registration_fee()
returns table (
  fee_enabled boolean,
  fee_amount numeric
)
language sql
stable
security definer
set search_path = ''
as $function$
  select settings.fee_enabled, settings.fee_amount
  from public.business_registration_settings as settings
  where settings.id = 1;
$function$;

create or replace function public.can_delete_business_registration_proof(
  requested_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    auth.uid() is not null
    and requested_path like auth.uid()::text || '/registration/%'
    and not exists (
      select 1
      from public.business_registration_payments as payment
      where payment.payment_proof_path = requested_path
        and payment.status in ('pending', 'approved')
    );
$function$;

create or replace function public.can_upload_business_registration_proof(
  requested_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    auth.uid() is not null
    and requested_path like (auth.uid()::text || '/registration/%')
    and exists (
      select 1
      from public.business_applications as application
      where application.id::text = split_part(requested_path, '/', 3)
        and application.applicant_id = auth.uid()
        and application.status::text = 'pending'
        and application.documents_approved_at is not null
    );
$function$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-registration-proofs',
  'business-registration-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Applicants can upload registration payment proofs"
  on storage.objects;
drop policy if exists "Applicants can read registration payment proofs"
  on storage.objects;
drop policy if exists "Applicants can delete unsubmitted registration payment proofs"
  on storage.objects;
drop policy if exists "Administrators can read registration payment proofs"
  on storage.objects;

create policy "Applicants can upload registration payment proofs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-registration-proofs'
  and public.can_upload_business_registration_proof(name)
);

create policy "Applicants can read registration payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-registration-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Applicants can delete unsubmitted registration payment proofs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-registration-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.can_delete_business_registration_proof(name)
);

create policy "Administrators can read registration payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-registration-proofs'
  and coalesce(public.is_admin(), false)
);

create or replace function public.get_mobile_business_registration_checkout(
  requested_application_id uuid
)
returns table (
  application_id uuid,
  application_status text,
  documents_approved_at timestamptz,
  payment_due_at timestamptz,
  fee_enabled boolean,
  amount numeric,
  payment_method text,
  account_name text,
  account_number text,
  instructions text,
  payment_id uuid,
  payment_status text,
  payment_reference text,
  payment_proof_path text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be logged in.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.business_applications as application
    where application.id = requested_application_id
      and application.applicant_id = auth.uid()
  ) then
    raise exception 'Business application not found.' using errcode = 'P0001';
  end if;

  return query
  select
    application.id,
    application.status::text,
    application.documents_approved_at,
    application.registration_fee_due_at,
    coalesce(settings.fee_enabled, false),
    coalesce(payment.amount_snapshot, settings.fee_amount, 0),
    coalesce(payment.payment_method_snapshot, settings.payment_method, ''),
    coalesce(payment.account_name_snapshot, settings.account_name, ''),
    coalesce(payment.account_number_snapshot, settings.account_number, ''),
    coalesce(payment.instructions_snapshot, settings.instructions),
    payment.id,
    coalesce(payment.status, 'not_required'),
    payment.payment_reference,
    payment.payment_proof_path,
    payment.rejection_reason,
    payment.submitted_at,
    payment.reviewed_at
  from public.business_applications as application
  left join public.business_registration_settings as settings on settings.id = 1
  left join public.business_registration_payments as payment
    on payment.application_id = application.id
  where application.id = requested_application_id
    and application.applicant_id = auth.uid();
end;
$function$;

create or replace function public.submit_business_registration_payment(
  requested_application_id uuid,
  requested_payment_reference text,
  requested_payment_proof_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_reference text := btrim(coalesce(requested_payment_reference, ''));
  normalized_path text := btrim(coalesce(requested_payment_proof_path, ''));
  selected_payment public.business_registration_payments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in.' using errcode = 'P0001';
  end if;

  if char_length(normalized_reference) < 3 or char_length(normalized_reference) > 100 then
    raise exception 'Enter a valid payment reference.' using errcode = 'P0001';
  end if;

  if normalized_path not like (
    auth.uid()::text || '/registration/' || requested_application_id::text || '/%'
  ) then
    raise exception 'Invalid payment receipt path.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'business-registration-proofs'
      and object.name = normalized_path
  ) then
    raise exception 'Payment receipt was not uploaded.' using errcode = 'P0001';
  end if;

  select payment.*
  into selected_payment
  from public.business_registration_payments as payment
  join public.business_applications as application
    on application.id = payment.application_id
  where payment.application_id = requested_application_id
    and payment.applicant_id = auth.uid()
    and application.applicant_id = auth.uid()
    and application.status::text = 'pending'
    and application.documents_approved_at is not null
  for update of payment;

  if selected_payment.id is null then
    raise exception 'Registration payment is not ready yet.' using errcode = 'P0001';
  end if;

  if selected_payment.status not in ('required', 'rejected') then
    raise exception 'This registration payment cannot be submitted again.' using errcode = 'P0001';
  end if;

  update public.business_registration_payments
  set
    payment_reference = normalized_reference,
    payment_proof_path = normalized_path,
    status = 'pending',
    rejection_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    updated_at = now()
  where id = selected_payment.id;

  return selected_payment.id;
end;
$function$;

create or replace function public.get_admin_business_registration_settings()
returns table (
  fee_enabled boolean,
  fee_amount numeric,
  payment_method text,
  account_name text,
  account_number text,
  instructions text,
  payment_deadline_days integer,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  return query
  select
    settings.fee_enabled,
    settings.fee_amount,
    settings.payment_method,
    settings.account_name,
    settings.account_number,
    settings.instructions,
    settings.payment_deadline_days,
    settings.updated_at
  from public.business_registration_settings as settings
  where settings.id = 1;
end;
$function$;

create or replace function public.save_admin_business_registration_settings(
  requested_fee_enabled boolean,
  requested_fee_amount numeric,
  requested_payment_method text,
  requested_account_name text,
  requested_account_number text,
  requested_instructions text,
  requested_payment_deadline_days integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_method text := btrim(coalesce(requested_payment_method, ''));
  normalized_name text := btrim(coalesce(requested_account_name, ''));
  normalized_number text := btrim(coalesce(requested_account_number, ''));
  normalized_instructions text := nullif(btrim(requested_instructions), '');
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  if requested_fee_amount < 0 or requested_fee_amount > 1000000 then
    raise exception 'Enter a valid registration fee.' using errcode = 'P0001';
  end if;

  if requested_fee_enabled and requested_fee_amount <= 0 then
    raise exception 'The enabled registration fee must be greater than zero.' using errcode = 'P0001';
  end if;

  if char_length(normalized_method) < 2 or char_length(normalized_method) > 50 then
    raise exception 'Enter a valid payment method.' using errcode = 'P0001';
  end if;

  if requested_fee_enabled and (
    char_length(normalized_name) < 2 or char_length(normalized_name) > 100
    or char_length(normalized_number) < 3 or char_length(normalized_number) > 100
  ) then
    raise exception 'Complete the payment account details before enabling the fee.'
      using errcode = 'P0001';
  end if;

  if requested_payment_deadline_days < 1 or requested_payment_deadline_days > 90 then
    raise exception 'Payment deadline must be between 1 and 90 days.'
      using errcode = 'P0001';
  end if;

  if char_length(coalesce(normalized_instructions, '')) > 500 then
    raise exception 'Payment instructions must not exceed 500 characters.'
      using errcode = 'P0001';
  end if;

  insert into public.business_registration_settings (
    id,
    fee_enabled,
    fee_amount,
    payment_method,
    account_name,
    account_number,
    instructions,
    payment_deadline_days,
    updated_at,
    updated_by
  )
  values (
    1,
    requested_fee_enabled,
    requested_fee_amount,
    normalized_method,
    normalized_name,
    normalized_number,
    normalized_instructions,
    requested_payment_deadline_days,
    now(),
    auth.uid()
  )
  on conflict (id) do update
  set
    fee_enabled = excluded.fee_enabled,
    fee_amount = excluded.fee_amount,
    payment_method = excluded.payment_method,
    account_name = excluded.account_name,
    account_number = excluded.account_number,
    instructions = excluded.instructions,
    payment_deadline_days = excluded.payment_deadline_days,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
end;
$function$;

create or replace function public.mark_business_application_documents_approved(
  requested_application_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_application public.business_applications%rowtype;
  settings public.business_registration_settings%rowtype;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  select application.*
  into selected_application
  from public.business_applications as application
  where application.id = requested_application_id
  for update;

  if selected_application.id is null then
    raise exception 'Business application not found.' using errcode = 'P0001';
  end if;

  if selected_application.status::text <> 'pending' then
    raise exception 'Only pending applications can be reviewed.' using errcode = 'P0001';
  end if;

  select configured.*
  into settings
  from public.business_registration_settings as configured
  where configured.id = 1;

  if settings.id is null or not settings.fee_enabled then
    perform public.review_business_application(requested_application_id, 'approve', null);
    return 'approved';
  end if;

  if settings.fee_amount <= 0
    or btrim(settings.account_name) = ''
    or btrim(settings.account_number) = ''
  then
    raise exception 'Configure and enable valid registration payment details first.'
      using errcode = 'P0001';
  end if;

  update public.business_applications
  set
    documents_approved_at = coalesce(documents_approved_at, now()),
    documents_approved_by = coalesce(documents_approved_by, auth.uid()),
    registration_fee_due_at = coalesce(
      registration_fee_due_at,
      now() + make_interval(days => settings.payment_deadline_days)
    ),
    updated_at = now()
  where id = requested_application_id;

  insert into public.business_registration_payments (
    application_id,
    applicant_id,
    amount_snapshot,
    payment_method_snapshot,
    account_name_snapshot,
    account_number_snapshot,
    instructions_snapshot,
    status
  )
  values (
    requested_application_id,
    selected_application.applicant_id,
    settings.fee_amount,
    settings.payment_method,
    settings.account_name,
    settings.account_number,
    settings.instructions,
    'required'
  )
  on conflict (application_id) do nothing;

  return 'payment_required';
end;
$function$;

create or replace function public.get_admin_business_registration_payments()
returns table (
  id uuid,
  application_id uuid,
  amount numeric,
  payment_method text,
  payment_reference text,
  payment_proof_path text,
  payment_status text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  payment_due_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  return query
  select
    payment.id,
    payment.application_id,
    payment.amount_snapshot,
    payment.payment_method_snapshot,
    payment.payment_reference,
    payment.payment_proof_path,
    payment.status,
    payment.rejection_reason,
    payment.submitted_at,
    payment.reviewed_at,
    application.registration_fee_due_at
  from public.business_registration_payments as payment
  join public.business_applications as application
    on application.id = payment.application_id
  order by coalesce(payment.submitted_at, payment.created_at) desc;
end;
$function$;

create or replace function public.approve_business_registration_payment(
  requested_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_payment public.business_registration_payments%rowtype;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  select payment.*
  into selected_payment
  from public.business_registration_payments as payment
  where payment.id = requested_payment_id
  for update;

  if selected_payment.id is null then
    raise exception 'Registration payment not found.' using errcode = 'P0001';
  end if;

  if selected_payment.status <> 'pending' then
    raise exception 'Only pending registration payments can be approved.'
      using errcode = 'P0001';
  end if;

  perform public.review_business_application(selected_payment.application_id, 'approve', null);

  update public.business_registration_payments
  set
    status = 'approved',
    rejection_reason = null,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  where id = selected_payment.id;
end;
$function$;

create or replace function public.reject_business_registration_payment(
  requested_payment_id uuid,
  requested_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_reason text := btrim(coalesce(requested_reason, ''));
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  if char_length(normalized_reason) < 8 or char_length(normalized_reason) > 500 then
    raise exception 'Enter a clear rejection reason (8 to 500 characters).'
      using errcode = 'P0001';
  end if;

  update public.business_registration_payments
  set
    status = 'rejected',
    rejection_reason = normalized_reason,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  where id = requested_payment_id
    and status = 'pending';

  if not found then
    raise exception 'Only pending registration payments can be rejected.'
      using errcode = 'P0001';
  end if;
end;
$function$;

-- Seed the client-approved Premium Listing defaults exactly once. Administrators
-- remain free to edit prices/durations later without a rerun resetting them.
do $seed$
declare
  initialized boolean;
begin
  select settings.premium_defaults_initialized
  into initialized
  from public.business_registration_settings as settings
  where settings.id = 1
  for update;

  if not coalesce(initialized, false) then
    if exists (select 1 from public.sponsorship_packages where duration_days = 7) then
      update public.sponsorship_packages
      set name = 'Weekly Premium', price = 299.00,
          description = 'Premium placement for 7 days.', is_active = true,
          updated_at = now()
      where id = (
        select id from public.sponsorship_packages
        where duration_days = 7 order by updated_at desc limit 1
      );
    else
      insert into public.sponsorship_packages
        (name, duration_days, price, description, is_active)
      values ('Weekly Premium', 7, 299.00, 'Premium placement for 7 days.', true);
    end if;

    if exists (select 1 from public.sponsorship_packages where duration_days = 30) then
      update public.sponsorship_packages
      set name = 'Monthly Premium', price = 999.00,
          description = 'Premium placement for 30 days.', is_active = true,
          updated_at = now()
      where id = (
        select id from public.sponsorship_packages
        where duration_days = 30 order by updated_at desc limit 1
      );
    else
      insert into public.sponsorship_packages
        (name, duration_days, price, description, is_active)
      values ('Monthly Premium', 30, 999.00, 'Premium placement for 30 days.', true);
    end if;

    if exists (select 1 from public.sponsorship_packages where duration_days = 365) then
      update public.sponsorship_packages
      set name = 'Annual Premium', price = 9999.00,
          description = 'Premium placement for 365 days.', is_active = true,
          updated_at = now()
      where id = (
        select id from public.sponsorship_packages
        where duration_days = 365 order by updated_at desc limit 1
      );
    else
      insert into public.sponsorship_packages
        (name, duration_days, price, description, is_active)
      values ('Annual Premium', 365, 9999.00, 'Premium placement for 365 days.', true);
    end if;

    update public.sponsorship_packages
    set is_active = false, updated_at = now()
    where duration_days not in (7, 30, 365);

    update public.business_registration_settings
    set premium_defaults_initialized = true
    where id = 1;
  end if;
end;
$seed$;

revoke all on function public.get_mobile_business_registration_checkout(uuid)
  from public, anon;
revoke all on function public.get_public_business_registration_fee()
  from public;
revoke all on function public.can_delete_business_registration_proof(text)
  from public, anon;
revoke all on function public.can_upload_business_registration_proof(text)
  from public, anon;
revoke all on function public.submit_business_registration_payment(uuid, text, text)
  from public, anon;
revoke all on function public.get_admin_business_registration_settings()
  from public, anon;
revoke all on function public.save_admin_business_registration_settings(boolean, numeric, text, text, text, text, integer)
  from public, anon;
revoke all on function public.mark_business_application_documents_approved(uuid)
  from public, anon;
revoke all on function public.get_admin_business_registration_payments()
  from public, anon;
revoke all on function public.approve_business_registration_payment(uuid)
  from public, anon;
revoke all on function public.reject_business_registration_payment(uuid, text)
  from public, anon;

grant execute on function public.get_mobile_business_registration_checkout(uuid)
  to authenticated;
grant execute on function public.get_public_business_registration_fee()
  to anon, authenticated;
grant execute on function public.can_delete_business_registration_proof(text)
  to authenticated;
grant execute on function public.can_upload_business_registration_proof(text)
  to authenticated;
grant execute on function public.submit_business_registration_payment(uuid, text, text)
  to authenticated;
grant execute on function public.get_admin_business_registration_settings()
  to authenticated;
grant execute on function public.save_admin_business_registration_settings(boolean, numeric, text, text, text, text, integer)
  to authenticated;
grant execute on function public.mark_business_application_documents_approved(uuid)
  to authenticated;
grant execute on function public.get_admin_business_registration_payments()
  to authenticated;
grant execute on function public.approve_business_registration_payment(uuid)
  to authenticated;
grant execute on function public.reject_business_registration_payment(uuid, text)
  to authenticated;

commit;

select 'BUSINESS REGISTRATION FEE AND PREMIUM LISTINGS READY' as result;
