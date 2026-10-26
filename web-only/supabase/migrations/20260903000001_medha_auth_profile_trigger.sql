-- Medha AI auth/profile bridge.
-- Run this after 20260903000000_medha_foundation.sql.

alter table public.patient_profiles
  add column if not exists languages text[] not null default array['English']::text[];

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert with check (id = auth.uid());

create or replace function public.handle_new_medha_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role public.app_role;
  selected_name text;
begin
  selected_role := case
    when new.raw_user_meta_data->>'role' = 'caregiver' then 'caregiver'::public.app_role
    when new.raw_user_meta_data->>'role' = 'family_member' then 'family_member'::public.app_role
    when new.raw_user_meta_data->>'role' = 'clinician' then 'clinician'::public.app_role
    else 'patient'::public.app_role
  end;

  selected_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.email, ''),
    'Medha user'
  );

  insert into public.profiles (id, role, display_name)
  values (new.id, selected_role, selected_name)
  on conflict (id) do nothing;

  if selected_role = 'patient' then
    insert into public.patient_profiles (id, is_test_data)
    values (new.id, false)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_medha on auth.users;
create trigger on_auth_user_created_medha
  after insert on auth.users
  for each row execute procedure public.handle_new_medha_user();