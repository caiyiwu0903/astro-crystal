-- 放心占星相談所：預約與課程報名資料庫
-- 管理者限定為網站負責人的公開聯絡 Email。

create extension if not exists pgcrypto;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.role() = 'authenticated'
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'caiyiwu0903@gmail.com';
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.consultation_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'confirmed', 'completed', 'cancelled')),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  contact_channel text not null
    check (contact_channel in ('line', 'instagram', 'facebook', 'email')),
  contact_value text not null check (char_length(btrim(contact_value)) between 1 and 255),
  consultation_mode text not null
    check (consultation_mode in ('online', 'in_person')),
  birth_date date,
  birth_time time,
  birth_time_is_exact boolean not null default true,
  birth_place text check (birth_place is null or char_length(btrim(birth_place)) <= 255),
  question text not null check (char_length(btrim(question)) between 5 and 3000),
  preferred_dates text not null check (char_length(btrim(preferred_dates)) between 2 and 1000),
  consent boolean not null check (consent = true),
  privacy_version text not null default '2026-07-17',
  internal_notes text
);

create table if not exists public.course_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'confirmed', 'enrolled', 'cancelled')),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  contact_channel text not null
    check (contact_channel in ('line', 'instagram', 'facebook', 'email')),
  contact_value text not null check (char_length(btrim(contact_value)) between 1 and 255),
  astrology_background text not null
    check (char_length(btrim(astrology_background)) between 2 and 2000),
  preferred_format text not null check (preferred_format in (
    'online_group',
    'taipei_group',
    'in_person_one_to_one',
    'online_one_to_one',
    'recorded'
  )),
  available_dates text not null check (char_length(btrim(available_dates)) between 2 and 1000),
  message text check (message is null or char_length(btrim(message)) <= 3000),
  consent boolean not null check (consent = true),
  privacy_version text not null default '2026-07-17',
  internal_notes text
);

drop trigger if exists consultation_bookings_set_updated_at on public.consultation_bookings;
create trigger consultation_bookings_set_updated_at
before update on public.consultation_bookings
for each row execute function public.set_updated_at();

drop trigger if exists course_applications_set_updated_at on public.course_applications;
create trigger course_applications_set_updated_at
before update on public.course_applications
for each row execute function public.set_updated_at();

create index if not exists consultation_bookings_created_at_idx
  on public.consultation_bookings (created_at desc);
create index if not exists consultation_bookings_status_idx
  on public.consultation_bookings (status);
create index if not exists course_applications_created_at_idx
  on public.course_applications (created_at desc);
create index if not exists course_applications_status_idx
  on public.course_applications (status);

alter table public.consultation_bookings enable row level security;
alter table public.course_applications enable row level security;

revoke all on table public.consultation_bookings from anon, authenticated;
revoke all on table public.course_applications from anon, authenticated;

grant insert on table public.consultation_bookings to anon;
grant insert on table public.course_applications to anon;
grant select, insert, update, delete on table public.consultation_bookings to authenticated;
grant select, insert, update, delete on table public.course_applications to authenticated;

drop policy if exists consultation_public_submit on public.consultation_bookings;
create policy consultation_public_submit
on public.consultation_bookings
for insert
to anon
with check (
  status = 'pending'
  and internal_notes is null
  and consent = true
);

drop policy if exists consultation_admin_manage on public.consultation_bookings;
create policy consultation_admin_manage
on public.consultation_bookings
for all
to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));

drop policy if exists course_public_submit on public.course_applications;
create policy course_public_submit
on public.course_applications
for insert
to anon
with check (
  status = 'pending'
  and internal_notes is null
  and consent = true
);

drop policy if exists course_admin_manage on public.course_applications;
create policy course_admin_manage
on public.course_applications
for all
to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));

comment on table public.consultation_bookings is '星盤諮詢預約；包含出生資料，僅指定管理者可讀取。';
comment on table public.course_applications is '古典占星專業解盤師養成班報名資料，僅指定管理者可讀取。';
