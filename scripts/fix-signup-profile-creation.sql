-- The free-subscription trigger ran with the caller's privileges, so a profile insert made with
-- an end-user session was rejected by RLS on user_subscriptions and the signup lost its profile.
create or replace function public.create_free_subscription()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.user_subscriptions (user_id, status, is_founder)
  values (new.id, 'free', extract(year from new.created_at) = 2026);
  return new;
end;
$function$;

-- Ignore any unique conflict (id or email) so a profile clash can never abort the auth signup itself.
create or replace function public.create_user_after_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.users (id, email, full_name, profile_image_url, created_at, updated_at, is_client, is_professional, phone_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    now(),
    now(),
    false,
    false,
    false
  )
  on conflict do nothing;
  return new;
end;
$function$;

-- OAuth accounts (Google) are created already confirmed, so the UPDATE-only trigger never fired for them.
drop trigger if exists on_auth_user_created_confirmed on auth.users;
create trigger on_auth_user_created_confirmed
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.create_user_after_signup();

-- Backfill accounts that signed in but never got a profile.
insert into public.users (id, email, full_name, first_name, last_name, profile_image_url, verified_at, created_at, updated_at)
select
  a.id,
  a.email,
  coalesce(a.raw_user_meta_data->>'full_name', a.raw_user_meta_data->>'name', ''),
  split_part(coalesce(a.raw_user_meta_data->>'full_name', a.raw_user_meta_data->>'name', ''), ' ', 1),
  nullif(regexp_replace(coalesce(a.raw_user_meta_data->>'full_name', a.raw_user_meta_data->>'name', ''), '^\S+\s*', ''), ''),
  coalesce(a.raw_user_meta_data->>'avatar_url', a.raw_user_meta_data->>'picture', ''),
  coalesce(a.email_confirmed_at, now()),
  now(),
  now()
from auth.users a
where a.email is not null
  and not exists (select 1 from public.users u where u.id = a.id)
  and not exists (select 1 from public.users u where lower(u.email) = lower(a.email))
on conflict (id) do nothing;
