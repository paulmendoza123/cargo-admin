-- CargoTrackPH one-time administrator bootstrap
--
-- 1. Create the intended administrator as a normal Supabase Auth user.
-- 2. Confirm that user's email address.
-- 3. Replace REPLACE_WITH_ADMIN_EMAIL below and run this entire file once.
--
-- This script deliberately refuses to run if an administrator already exists.
-- Future admin promotions should use a controlled server-side process, never
-- a public client-side role update.

do $bootstrap$
declare
  requested_email text := lower(btrim('REPLACE_WITH_ADMIN_EMAIL'));
  target_user_id uuid;
begin
  if requested_email = 'replace_with_admin_email'
     or requested_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Replace REPLACE_WITH_ADMIN_EMAIL with a valid email address.';
  end if;

  if exists (
    select 1
    from public.profiles
    where role::text = 'admin'
  ) then
    raise exception 'Administrator bootstrap blocked: an admin profile already exists.';
  end if;

  select users.id
  into target_user_id
  from auth.users as users
  where lower(users.email) = requested_email
    and users.email_confirmed_at is not null
  limit 1;

  if target_user_id is null then
    raise exception 'No confirmed Supabase Auth user exists for %.', requested_email;
  end if;

  update public.profiles
  set
    role = 'admin',
    account_status = 'active',
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'The Auth user exists, but its public.profiles row is missing.';
  end if;
end
$bootstrap$;

select
  id,
  email,
  full_name,
  role,
  account_status
from public.profiles
where role::text = 'admin';
