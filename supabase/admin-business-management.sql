-- CargoTrackPH: secure administrator business management.
-- Run this once in the Supabase SQL Editor after the core business tables exist.
-- Safe to run more than once.

create table if not exists public.business_status_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  old_status public.business_status,
  new_status public.business_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  changed_at timestamptz not null default now()
);

create index if not exists business_status_history_business_changed_idx
  on public.business_status_history (business_id, changed_at desc);

alter table public.business_status_history enable row level security;

revoke all on table public.business_status_history
  from public, anon, authenticated;

create or replace function public.get_admin_businesses()
returns table (
  id uuid,
  business_code text,
  owner_id uuid,
  application_id uuid,
  name text,
  representative_name text,
  email text,
  phone text,
  address text,
  description text,
  branch_latitude double precision,
  branch_longitude double precision,
  logo_path text,
  cover_path text,
  business_status text,
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  destinations text[],
  cargo_types text[],
  destinations_count bigint,
  rates_count bigint,
  bookings_count bigint,
  gallery_count bigint
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
    business.id,
    business.business_code,
    business.owner_id,
    business.application_id,
    business.name,
    business.representative_name,
    business.email,
    business.phone,
    business.address,
    business.description,
    business.branch_latitude,
    business.branch_longitude,
    business.logo_path,
    business.cover_path,
    business.status::text,
    business.approved_at,
    business.created_at,
    business.updated_at,
    coalesce(destination_summary.names, array[]::text[]),
    coalesce(rate_summary.cargo_type_names, array[]::text[]),
    coalesce(destination_summary.total, 0::bigint),
    coalesce(rate_summary.total, 0::bigint),
    coalesce(booking_summary.total, 0::bigint),
    coalesce(gallery_summary.total, 0::bigint)
  from public.businesses as business
  left join lateral (
    select
      array_agg(destination.name order by destination.name) as names,
      count(*)::bigint as total
    from public.business_destinations as business_destination
    join public.destinations as destination
      on destination.id = business_destination.destination_id
    where business_destination.business_id = business.id
      and business_destination.is_available = true
  ) as destination_summary on true
  left join lateral (
    select
      array_agg(
        distinct cargo_type.name
        order by cargo_type.name
      ) as cargo_type_names,
      count(*)::bigint as total
    from public.business_rates as rate
    join public.cargo_types as cargo_type
      on cargo_type.id = rate.cargo_type_id
    where rate.business_id = business.id
      and rate.is_available = true
  ) as rate_summary on true
  left join lateral (
    select count(*)::bigint as total
    from public.bookings as booking
    where booking.business_id = business.id
  ) as booking_summary on true
  left join lateral (
    select count(*)::bigint as total
    from public.business_gallery_images as gallery
    where gallery.business_id = business.id
  ) as gallery_summary on true
  order by business.approved_at desc, business.name;
end;
$function$;

create or replace function public.get_admin_business_status_history(
  requested_business_id uuid
)
returns table (
  id uuid,
  business_id uuid,
  old_status text,
  new_status text,
  changed_by uuid,
  reason text,
  changed_at timestamptz
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
    history.id,
    history.business_id,
    history.old_status::text,
    history.new_status::text,
    history.changed_by,
    history.reason,
    history.changed_at
  from public.business_status_history as history
  where history.business_id = requested_business_id
  order by history.changed_at desc;
end;
$function$;

create or replace function public.set_admin_business_status(
  requested_business_id uuid,
  requested_status text,
  requested_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  business_record public.businesses%rowtype;
  normalized_status text := lower(btrim(coalesce(requested_status, '')));
  normalized_reason text := nullif(btrim(coalesce(requested_reason, '')), '');
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  if normalized_status not in ('active', 'suspended') then
    raise exception 'Invalid business status.' using errcode = 'P0001';
  end if;

  if normalized_status = 'suspended'
    and char_length(coalesce(normalized_reason, '')) < 8
  then
    raise exception 'Enter a suspension reason with at least 8 characters.'
      using errcode = 'P0001';
  end if;

  if char_length(coalesce(normalized_reason, '')) > 500 then
    raise exception 'The status reason must not exceed 500 characters.'
      using errcode = 'P0001';
  end if;

  select *
  into business_record
  from public.businesses as business
  where business.id = requested_business_id
  for update;

  if not found then
    raise exception 'Business not found.' using errcode = 'P0001';
  end if;

  if business_record.status::text = normalized_status then
    return;
  end if;

  update public.businesses
  set
    status = normalized_status::public.business_status,
    updated_at = now()
  where id = requested_business_id;

  insert into public.business_status_history (
    business_id,
    old_status,
    new_status,
    changed_by,
    reason
  )
  values (
    requested_business_id,
    business_record.status,
    normalized_status::public.business_status,
    auth.uid(),
    coalesce(
      normalized_reason,
      case
        when normalized_status = 'active'
          then 'Business reactivated by administrator.'
        else null
      end
    )
  );
end;
$function$;

revoke all on function public.get_admin_businesses()
  from public, anon;
revoke all on function public.get_admin_business_status_history(uuid)
  from public, anon;
revoke all on function public.set_admin_business_status(uuid, text, text)
  from public, anon;

grant execute on function public.get_admin_businesses()
  to authenticated;
grant execute on function public.get_admin_business_status_history(uuid)
  to authenticated;
grant execute on function public.set_admin_business_status(uuid, text, text)
  to authenticated;

select 'ADMIN BUSINESS MANAGEMENT READY' as result;
