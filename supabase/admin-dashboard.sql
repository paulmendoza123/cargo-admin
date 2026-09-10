-- CargoTrackPH: live administrator dashboard data.
-- Run this after the core application, business, booking, user verification,
-- and sponsorship tables exist. Safe to run more than once.

create or replace function public.get_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  dashboard_payload jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total_businesses', (
        select count(*)
        from public.businesses
      ),
      'active_businesses', (
        select count(*)
        from public.businesses
        where status::text = 'active'
      ),
      'suspended_businesses', (
        select count(*)
        from public.businesses
        where status::text = 'suspended'
      ),
      'pending_applications', (
        select count(*)
        from public.business_applications
        where status::text = 'pending'
      ),
      'customer_accounts', (
        select count(*)
        from public.profiles
        where role::text = 'customer'
      ),
      'business_accounts', (
        select count(*)
        from public.profiles
        where role::text = 'business'
      ),
      'pending_sponsorships', (
        select count(*)
        from public.sponsorship_requests
        where status::text = 'pending'
      ),
      'pending_identity_verifications', (
        select count(*)
        from public.customer_identity_documents
        where verification_status::text = 'pending'
      ),
      'total_bookings', (
        select count(*)
        from public.bookings
      )
    ),
    'pending_applications', coalesce(
      (
        select jsonb_agg(
          to_jsonb(application_row)
          order by application_row.submitted_at desc
        )
        from (
          select
            application.id,
            application.application_code,
            application.business_name,
            application.representative_name,
            application.submitted_at,
            application.status::text as status
          from public.business_applications as application
          where application.status::text = 'pending'
          order by application.submitted_at desc
          limit 5
        ) as application_row
      ),
      '[]'::jsonb
    ),
    'recent_businesses', coalesce(
      (
        select jsonb_agg(
          to_jsonb(business_row)
          order by business_row.approved_at desc
        )
        from (
          select
            business.id,
            business.business_code,
            business.name,
            business.address,
            business.logo_path,
            business.status::text as status,
            business.approved_at,
            (
              select count(*)
              from public.business_destinations as business_destination
              where business_destination.business_id = business.id
                and business_destination.is_available = true
            ) as destinations_count
          from public.businesses as business
          where business.status::text = 'active'
          order by business.approved_at desc
          limit 3
        ) as business_row
      ),
      '[]'::jsonb
    )
  )
  into dashboard_payload;

  return dashboard_payload;
end;
$function$;

revoke all on function public.get_admin_dashboard()
  from public, anon;

grant execute on function public.get_admin_dashboard()
  to authenticated;

select 'ADMIN DASHBOARD READY' as result;

