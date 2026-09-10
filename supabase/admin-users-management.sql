-- CargoTrackPH: secure administrator user and identity management.
-- Run after public.profiles, public.businesses,
-- public.customer_identity_documents, and public.is_admin() exist.
-- Safe to run more than once.

create table if not exists public.user_account_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  changed_at timestamptz not null default now(),
  constraint user_account_history_old_status_check
    check (old_status is null or old_status in ('active', 'suspended')),
  constraint user_account_history_new_status_check
    check (new_status in ('active', 'suspended'))
);

create index if not exists user_account_history_user_changed_idx
  on public.user_account_status_history (user_id, changed_at desc);

create table if not exists public.customer_identity_review_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null
    references public.customer_identity_documents(id) on delete cascade,
  customer_id uuid not null
    references public.profiles(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  changed_at timestamptz not null default now(),
  constraint customer_identity_history_old_status_check
    check (
      old_status is null
      or old_status in ('pending', 'verified', 'rejected')
    ),
  constraint customer_identity_history_new_status_check
    check (new_status in ('verified', 'rejected'))
);

create index if not exists identity_review_history_customer_changed_idx
  on public.customer_identity_review_history (customer_id, changed_at desc);

alter table public.user_account_status_history enable row level security;
alter table public.customer_identity_review_history enable row level security;

revoke all on table public.user_account_status_history
  from public, anon, authenticated;
revoke all on table public.customer_identity_review_history
  from public, anon, authenticated;

create or replace function public.get_admin_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  user_role text,
  account_status text,
  created_at timestamptz,
  business_name text,
  identity_document_id uuid,
  identity_id_type text,
  identity_storage_path text,
  identity_verification_status text,
  identity_submitted_at timestamptz,
  identity_reviewed_at timestamptz,
  identity_rejection_reason text
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
    profile.id,
    profile.email,
    profile.full_name,
    profile.phone,
    profile.role::text,
    profile.account_status::text,
    profile.created_at,
    linked_business.name,
    identity_document.id,
    identity_document.id_type,
    identity_document.storage_path,
    identity_document.verification_status::text,
    identity_document.created_at,
    identity_document.reviewed_at,
    identity_document.rejection_reason
  from public.profiles as profile
  left join lateral (
    select business.name
    from public.businesses as business
    where business.owner_id = profile.id
    order by business.created_at desc
    limit 1
  ) as linked_business on true
  left join lateral (
    select
      document.id,
      document.id_type,
      document.storage_path,
      document.verification_status,
      document.created_at,
      document.reviewed_at,
      document.rejection_reason
    from public.customer_identity_documents as document
    where document.customer_id = profile.id
    order by document.created_at desc
    limit 1
  ) as identity_document on true
  where profile.role::text in ('customer', 'business')
  order by profile.created_at desc;
end;
$function$;

create or replace function public.get_admin_user_activity(
  requested_user_id uuid
)
returns table (
  activity_id uuid,
  activity_type text,
  old_status text,
  new_status text,
  note text,
  changed_at timestamptz,
  changed_by uuid,
  changed_by_name text
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

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = requested_user_id
      and profile.role::text in ('customer', 'business')
  ) then
    raise exception 'User account not found.' using errcode = 'P0001';
  end if;

  return query
  with activity as (
    select
      history.id,
      'account'::text as event_type,
      history.old_status,
      history.new_status,
      history.note,
      history.changed_at,
      history.changed_by
    from public.user_account_status_history as history
    where history.user_id = requested_user_id

    union all

    select
      history.id,
      'identity'::text,
      history.old_status,
      history.new_status,
      history.rejection_reason,
      history.changed_at,
      history.changed_by
    from public.customer_identity_review_history as history
    where history.customer_id = requested_user_id
  )
  select
    activity.id,
    activity.event_type,
    activity.old_status,
    activity.new_status,
    activity.note,
    activity.changed_at,
    activity.changed_by,
    reviewer.full_name
  from activity
  left join public.profiles as reviewer
    on reviewer.id = activity.changed_by
  order by activity.changed_at desc
  limit 50;
end;
$function$;

-- Remove earlier text RPCs introduced by previous migration versions.
-- Existing enum overloads are intentionally preserved for compatibility.
drop function if exists public.set_user_account_status(uuid, text);
drop function if exists public.set_admin_user_account_status(uuid, text);

create or replace function public.set_admin_managed_user_status(
  target_user_id uuid,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_profile public.profiles%rowtype;
  normalized_status text := lower(btrim(coalesce(target_status, '')));
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  if normalized_status not in ('active', 'suspended') then
    raise exception 'Invalid account status.' using errcode = 'P0001';
  end if;

  if target_user_id is null then
    raise exception 'No target user was supplied.' using errcode = 'P0001';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own administrator account.'
      using errcode = 'P0001';
  end if;

  select profile.*
  into target_profile
  from public.profiles as profile
  where profile.id = target_user_id
  for update;

  if target_profile.id is null then
    raise exception 'User account % was not found.', target_user_id
      using errcode = 'P0001';
  end if;

  if target_profile.role::text not in ('customer', 'business') then
    raise exception 'The selected account role cannot be managed here.'
      using errcode = 'P0001';
  end if;

  if target_profile.account_status::text = normalized_status then
    return;
  end if;

  if normalized_status = 'active' then
    update public.profiles
    set account_status = 'active'
    where id = target_user_id;
  else
    update public.profiles
    set account_status = 'suspended'
    where id = target_user_id;
  end if;

  insert into public.user_account_status_history (
    user_id,
    old_status,
    new_status,
    changed_by,
    note
  )
  values (
    target_user_id,
    target_profile.account_status::text,
    normalized_status,
    auth.uid(),
    case
      when normalized_status = 'active'
        then 'Account activated by administrator.'
      else 'Account disabled by administrator.'
    end
  );
end;
$function$;

create or replace function public.review_customer_identity_document(
  requested_document_id uuid,
  requested_status text,
  requested_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  customer_id_value uuid;
  current_status text;
  current_reason text;
  normalized_status text := lower(btrim(coalesce(requested_status, '')));
  normalized_reason text := nullif(
    btrim(coalesce(requested_rejection_reason, '')),
    ''
  );
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Administrator access required.' using errcode = 'P0001';
  end if;

  if normalized_status not in ('verified', 'rejected') then
    raise exception 'Invalid verification status.' using errcode = 'P0001';
  end if;

  if normalized_status = 'rejected'
    and char_length(coalesce(normalized_reason, '')) < 8
  then
    raise exception 'Enter a rejection reason with at least 8 characters.'
      using errcode = 'P0001';
  end if;

  if char_length(coalesce(normalized_reason, '')) > 500 then
    raise exception 'The rejection reason must not exceed 500 characters.'
      using errcode = 'P0001';
  end if;

  select
    document.customer_id,
    document.verification_status::text,
    document.rejection_reason
  into
    customer_id_value,
    current_status,
    current_reason
  from public.customer_identity_documents as document
  where document.id = requested_document_id
  for update;

  if not found then
    raise exception 'Identity document not found.' using errcode = 'P0001';
  end if;

  if current_status = normalized_status
    and current_reason is not distinct from (
      case
        when normalized_status = 'rejected' then normalized_reason
        else null
      end
    )
  then
    return;
  end if;

  if normalized_status = 'verified' then
    update public.customer_identity_documents
    set
      verification_status = 'verified',
      rejection_reason = null,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
    where id = requested_document_id;
  else
    update public.customer_identity_documents
    set
      verification_status = 'rejected',
      rejection_reason = normalized_reason,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
    where id = requested_document_id;
  end if;

  insert into public.customer_identity_review_history (
    document_id,
    customer_id,
    old_status,
    new_status,
    changed_by,
    rejection_reason
  )
  values (
    requested_document_id,
    customer_id_value,
    current_status,
    normalized_status,
    auth.uid(),
    case
      when normalized_status = 'rejected' then normalized_reason
      else null
    end
  );
end;
$function$;

-- Admins may create short-lived signed preview links for private customer IDs.
-- This policy grants read-only Storage access and never makes the bucket public.
drop policy if exists "Administrators can preview customer identity documents"
on storage.objects;

create policy "Administrators can preview customer identity documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'customer-ids'
  and coalesce(public.is_admin(), false)
);

revoke all on function public.get_admin_users()
  from public, anon;
revoke all on function public.get_admin_user_activity(uuid)
  from public, anon;
revoke all on function public.set_admin_managed_user_status(uuid, text)
  from public, anon;
revoke all on function public.review_customer_identity_document(uuid, text, text)
  from public, anon;

grant execute on function public.get_admin_users()
  to authenticated;
grant execute on function public.get_admin_user_activity(uuid)
  to authenticated;
grant execute on function public.set_admin_managed_user_status(uuid, text)
  to authenticated;
grant execute on function public.review_customer_identity_document(uuid, text, text)
  to authenticated;

select 'ADMIN USERS MANAGEMENT READY' as result;
