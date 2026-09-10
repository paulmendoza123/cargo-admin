-- CargoTrackPH: secure administrator access for sponsorship management.
-- Run this after supabase/sponsorship-mobile-workflow.sql from the mobile app.
-- Safe to run more than once in the Supabase SQL Editor.

create or replace function public.get_admin_sponsorship_requests()
returns table (
  id uuid,
  request_code text,
  business_id uuid,
  business_name text,
  representative_name text,
  business_email text,
  business_phone text,
  package_id uuid,
  package_name text,
  duration_days integer,
  price numeric,
  payment_method text,
  payment_reference text,
  payment_proof_path text,
  request_status text,
  rejection_reason text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  placement_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  placement_is_enabled boolean,
  placement_is_active boolean
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
    request.id,
    request.request_code,
    request.business_id,
    business.name,
    business.representative_name,
    business.email,
    business.phone,
    request.package_id,
    request.package_name_snapshot,
    request.duration_days_snapshot,
    request.price_snapshot,
    request.payment_method,
    request.payment_reference,
    request.payment_proof_path,
    request.status::text,
    request.rejection_reason,
    request.requested_at,
    request.reviewed_at,
    placement.id,
    placement.starts_at,
    placement.ends_at,
    placement.is_enabled,
    coalesce(
      placement.is_enabled = true
        and placement.starts_at <= now()
        and placement.ends_at > now(),
      false
    )
  from public.sponsorship_requests as request
  join public.businesses as business
    on business.id = request.business_id
  left join lateral (
    select selected_placement.*
    from public.sponsored_placements as selected_placement
    where selected_placement.sponsorship_request_id = request.id
    order by selected_placement.created_at desc
    limit 1
  ) as placement on true
  order by request.requested_at desc;
end;
$function$;

create or replace function public.get_admin_sponsorship_packages()
returns table (
  id uuid,
  name text,
  duration_days integer,
  price numeric,
  description text,
  is_active boolean,
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
    package.id,
    package.name,
    package.duration_days,
    package.price,
    package.description,
    package.is_active,
    package.updated_at
  from public.sponsorship_packages as package
  order by package.duration_days, package.price, package.name;
end;
$function$;

create or replace function public.get_admin_sponsorship_checkout()
returns table (
  payment_method text,
  account_name text,
  account_number text,
  instructions text,
  is_enabled boolean,
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
    settings.payment_method,
    settings.account_name,
    settings.account_number,
    settings.instructions,
    settings.is_enabled,
    settings.updated_at
  from public.sponsorship_payment_settings as settings
  where settings.id = 1;
end;
$function$;

revoke all on function public.get_admin_sponsorship_requests()
  from public, anon;
revoke all on function public.get_admin_sponsorship_packages()
  from public, anon;
revoke all on function public.get_admin_sponsorship_checkout()
  from public, anon;

grant execute on function public.get_admin_sponsorship_requests()
  to authenticated;
grant execute on function public.get_admin_sponsorship_packages()
  to authenticated;
grant execute on function public.get_admin_sponsorship_checkout()
  to authenticated;

drop policy if exists "Administrators can read sponsorship payment proofs"
  on storage.objects;

create policy "Administrators can read sponsorship payment proofs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sponsorship-proofs'
  and coalesce(public.is_admin(), false)
);

select 'ADMIN SPONSORSHIP WORKFLOW READY' as result;
