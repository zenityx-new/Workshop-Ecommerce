-- =====================================================================
-- Phase 2 — Denormalize email onto profiles so admins can search users
-- without needing service-role access to auth.users.
-- =====================================================================

alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create index idx_profiles_email on public.profiles(email);

-- Keep email in sync at signup time (and backfill on conflict, just in case).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
