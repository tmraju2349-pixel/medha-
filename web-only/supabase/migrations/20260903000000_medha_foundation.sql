-- Medha AI foundation schema
-- Designed for Supabase's free tier.
--
-- Apply this file in the Supabase SQL Editor for the connected project.
-- The API server intentionally keeps its Supabase connector server-side.

create extension if not exists "pgcrypto";

create type public.app_role as enum ('patient', 'caregiver', 'family_member', 'clinician', 'administrator');
create type public.link_status as enum ('pending', 'active', 'revoked');
create type public.task_status as enum ('pending', 'done', 'snoozed');
create type public.task_category as enum ('medicine', 'hydration', 'routine', 'appointment');
create type public.notification_kind as enum ('important', 'gentle', 'safety');
create type public.diary_audio_status as enum ('saved-locally', 'uploading', 'ready', 'failed');
create type public.safety_event_type as enum ('manual_sos', 'geofence_exit', 'fall_suspected', 'inactivity');
create type public.safety_event_status as enum ('open', 'acknowledged', 'resolved');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'patient',
  display_name text not null,
  preferred_language text not null default 'English',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  age integer check (age is null or age between 0 and 130),
  region text,
  home_address text,
  caregiver_name text,
  caregiver_relationship text,
  caregiver_phone text,
  is_test_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.caregiver_patient_links (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  relationship text,
  status public.link_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (caregiver_id, patient_id)
);

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  time_text text,
  due_at timestamptz,
  recurrence text,
  category public.task_category not null default 'routine',
  icon text,
  status public.task_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind public.notification_kind not null default 'gentle',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_diary_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  transcript text not null default '',
  language text,
  audio_path text,
  audio_status public.diary_audio_status not null default 'ready',
  possible_task jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  game_key text not null,
  score integer not null default 0 check (score >= 0),
  mistakes integer not null default 0 check (mistakes >= 0),
  played_at timestamptz not null default now()
);

create table if not exists public.memory_cues (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  cue_type text not null check (cue_type in ('person', 'place', 'routine')),
  title text not null,
  detail text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safe_zones (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  label text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_meters integer not null default 150 check (radius_meters between 25 and 10000),
  is_home boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  event_type public.safety_event_type not null,
  event_status public.safety_event_status not null default 'open',
  latitude double precision,
  longitude double precision,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

create table if not exists public.medical_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_profiles(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  title text not null,
  report_date date,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  patient_id uuid references public.patient_profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists care_tasks_patient_id_idx on public.care_tasks(patient_id);
create index if not exists notifications_patient_id_idx on public.notifications(patient_id);
create index if not exists diary_patient_created_idx on public.voice_diary_entries(patient_id, created_at desc);
create index if not exists games_patient_played_idx on public.game_sessions(patient_id, played_at desc);
create index if not exists safety_patient_occurred_idx on public.safety_events(patient_id, occurred_at desc);
create index if not exists reports_patient_created_idx on public.medical_reports(patient_id, created_at desc);

create or replace function public.is_caregiver_for(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.caregiver_patient_links
    where caregiver_id = auth.uid()
      and patient_id = target_patient_id
      and status = 'active'
  );
$$;

create or replace function public.can_access_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = target_patient_id
    or public.is_caregiver_for(target_patient_id);
$$;

alter table public.profiles enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.caregiver_patient_links enable row level security;
alter table public.care_tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.voice_diary_entries enable row level security;
alter table public.game_sessions enable row level security;
alter table public.memory_cues enable row level security;
alter table public.safe_zones enable row level security;
alter table public.safety_events enable row level security;
alter table public.medical_reports enable row level security;
alter table public.device_tokens enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid());

drop policy if exists patient_profile_access on public.patient_profiles;
create policy patient_profile_access on public.patient_profiles for select using (public.can_access_patient(id));

drop policy if exists patient_profile_self_insert on public.patient_profiles;
create policy patient_profile_self_insert on public.patient_profiles for insert with check (id = auth.uid());

drop policy if exists patient_profile_self_update on public.patient_profiles;
create policy patient_profile_self_update on public.patient_profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists caregiver_links_access on public.caregiver_patient_links;
create policy caregiver_links_access on public.caregiver_patient_links
  for select using (caregiver_id = auth.uid() or patient_id = auth.uid());

drop policy if exists caregiver_links_create on public.caregiver_patient_links;
create policy caregiver_links_create on public.caregiver_patient_links
  for insert with check (caregiver_id = auth.uid());

drop policy if exists caregiver_links_update on public.caregiver_patient_links;
create policy caregiver_links_update on public.caregiver_patient_links
  for update using (caregiver_id = auth.uid() or patient_id = auth.uid());

drop policy if exists care_tasks_access on public.care_tasks;
create policy care_tasks_access on public.care_tasks for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists notifications_access on public.notifications;
create policy notifications_access on public.notifications for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists diary_access on public.voice_diary_entries;
create policy diary_access on public.voice_diary_entries for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists games_access on public.game_sessions;
create policy games_access on public.game_sessions for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists memory_access on public.memory_cues;
create policy memory_access on public.memory_cues for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists zones_access on public.safe_zones;
create policy zones_access on public.safe_zones for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists safety_access on public.safety_events;
create policy safety_access on public.safety_events for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists reports_access on public.medical_reports;
create policy reports_access on public.medical_reports for all
  using (public.can_access_patient(patient_id))
  with check (public.can_access_patient(patient_id));

drop policy if exists device_tokens_owner_access on public.device_tokens;
create policy device_tokens_owner_access on public.device_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists audit_logs_patient_access on public.audit_logs;
create policy audit_logs_patient_access on public.audit_logs for select
  using (actor_id = auth.uid() or public.can_access_patient(patient_id));

-- These private buckets are intentionally empty. The API will upload files
-- beneath a patient UUID after authentication and authorization are added.
insert into storage.buckets (id, name, public)
values ('medha-audio', 'medha-audio', false), ('medha-reports', 'medha-reports', false)
on conflict (id) do update set public = excluded.public;