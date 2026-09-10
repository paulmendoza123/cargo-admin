-- CargoTrackPH: secure cross-module search for the administrator portal.
-- Run after the core admin tables and public.is_admin() exist.
-- Safe to run more than once.

create or replace function public.search_admin_portal(
  requested_query text
)
returns table (
  result_type text,
  entity_id uuid,
  result_code text,
  title text,
  subtitle text,
  result_status text,
  target_path text,
  search_value text,
  search_rank integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  normalized_query text := lower(btrim(coalesce(requested_query, '')));
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  if char_length(normalized_query) < 2 then
    return;
  end if;

  if char_length(normalized_query) > 100 then
    raise exception 'Search must not exceed 100 characters.'
      using errcode = 'P0001';
  end if;

  return query
  with search_candidates as (
    select
      'Business'::text as result_type,
      business.id as entity_id,
      business.business_code as result_code,
      business.name as title,
      concat_ws(' · ', business.representative_name, business.email)
        as subtitle,
      business.status::text as result_status,
      '/businesses'::text as target_path,
      business.business_code as search_value,
      case
        when lower(business.name) = normalized_query then 0
        when position(normalized_query in lower(business.name)) = 1 then 1
        when position(normalized_query in lower(business.business_code)) = 1
          then 1
        else 2
      end as search_rank
    from public.businesses as business
    where position(
      normalized_query in lower(
        concat_ws(
          ' ',
          business.business_code,
          business.name,
          business.representative_name,
          business.email,
          business.phone,
          business.address
        )
      )
    ) > 0

    union all

    select
      'Application'::text,
      application.id,
      application.application_code,
      application.business_name,
      concat_ws(' · ', application.representative_name, application.email),
      application.status::text,
      '/applications'::text,
      application.application_code,
      case
        when lower(application.business_name) = normalized_query then 0
        when position(normalized_query in lower(application.business_name)) = 1
          then 1
        when position(
          normalized_query in lower(application.application_code)
        ) = 1 then 1
        else 2
      end
    from public.business_applications as application
    where position(
      normalized_query in lower(
        concat_ws(
          ' ',
          application.application_code,
          application.business_name,
          application.representative_name,
          application.email,
          application.phone
        )
      )
    ) > 0

    union all

    select
      'User'::text,
      profile.id,
      'USR-' || upper(substr(replace(profile.id::text, '-', ''), 1, 8)),
      profile.full_name,
      concat_ws(' · ', profile.email, initcap(profile.role::text)),
      profile.account_status::text,
      '/users'::text,
      coalesce(profile.email, profile.full_name),
      case
        when lower(profile.full_name) = normalized_query then 0
        when position(normalized_query in lower(profile.full_name)) = 1 then 1
        when position(
          normalized_query in lower(coalesce(profile.email, ''))
        ) = 1 then 1
        else 2
      end
    from public.profiles as profile
    where profile.role::text in ('customer', 'business')
      and position(
        normalized_query in lower(
          concat_ws(
            ' ',
            profile.full_name,
            profile.email,
            profile.phone,
            profile.role::text
          )
        )
      ) > 0

    union all

    select
      'Sponsorship'::text,
      request.id,
      request.request_code,
      business.name,
      request.package_name_snapshot,
      request.status::text,
      '/sponsored'::text,
      request.request_code,
      0
    from public.sponsorship_requests as request
    join public.businesses as business
      on business.id = request.business_id
    where lower(request.request_code) = normalized_query
      or lower(request.payment_reference) = normalized_query

    union all

    select
      'Sponsorship'::text,
      business.id,
      case
        when count(*) = 1 then
          (array_agg(request.request_code order by request.requested_at desc))[1]
        else
          (array_agg(request.request_code order by request.requested_at desc))[1]
            || ' +' || (count(*) - 1)::text
      end,
      business.name,
      count(*)::text
        || case when count(*) = 1 then ' sponsorship request' else ' sponsorship requests' end
        || ' · Latest: '
        || (array_agg(
          request.package_name_snapshot
          order by request.requested_at desc
        ))[1],
      (array_agg(request.status::text order by request.requested_at desc))[1],
      '/sponsored'::text,
      business.name,
      case
        when lower(business.name) = normalized_query then 0
        when position(normalized_query in lower(business.name)) = 1 then 1
        else 2
      end
    from public.sponsorship_requests as request
    join public.businesses as business
      on business.id = request.business_id
    where not exists (
      select 1
      from public.sponsorship_requests as exact_request
      where lower(exact_request.request_code) = normalized_query
        or lower(exact_request.payment_reference) = normalized_query
    )
    group by
      business.id,
      business.name,
      business.representative_name,
      business.email
    having position(
      normalized_query in lower(
        concat_ws(
          ' ',
          business.name,
          business.representative_name,
          business.email,
          string_agg(request.request_code, ' '),
          string_agg(request.package_name_snapshot, ' '),
          string_agg(request.payment_reference, ' ')
        )
      )
    ) > 0
  )
  select
    candidate.result_type,
    candidate.entity_id,
    candidate.result_code,
    candidate.title,
    candidate.subtitle,
    candidate.result_status,
    candidate.target_path,
    candidate.search_value,
    candidate.search_rank
  from search_candidates as candidate
  order by
    candidate.search_rank,
    candidate.result_type,
    candidate.title
  limit 12;
end;
$function$;

revoke all on function public.search_admin_portal(text)
  from public, anon;

grant execute on function public.search_admin_portal(text)
  to authenticated;

select 'ADMIN GLOBAL SEARCH READY' as result;
