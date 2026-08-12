-- EduCenter database schema
-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','teacher','student');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  full_name text not null,
  email text,
  phone text,
  student_id text unique,
  must_change_password boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  subject text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text,
  teacher_id uuid references public.teachers(id) on delete set null,
  solution_day text check (solution_day in ('sunday','tuesday','thursday') or solution_day is null),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  full_name text not null,
  student_id text unique not null,
  grade text,
  group_id uuid references public.groups(id) on delete set null,
  phone text,
  parent_phone text,
  seat_number text,
  attendance_percent numeric(5,2) not null default 0,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_date date not null,
  class_type text not null default 'regular' check(class_type in ('regular','solution')),
  status text not null check(status in ('present','absent','excused')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(student_id,class_date,class_type)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section text,
  max_score numeric(8,2) not null,
  exam_date date,
  teacher_id uuid references public.teachers(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(8,2) not null,
  created_at timestamptz not null default now(),
  unique(exam_id,student_id)
);

create table if not exists public.monthly_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  month date not null,
  score numeric(5,2),
  notes text,
  teacher_id uuid references public.teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(student_id,month)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  recipient_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(student_id,teacher_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.exams enable row level security;
alter table public.exam_results enable row level security;
alter table public.monthly_evaluations enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.audit_logs enable row level security;

-- Basic policies. For production, refine teacher permissions further.
create policy "profiles_self" on public.profiles for select using (id=auth.uid());
create policy "profiles_update_self" on public.profiles for update using (id=auth.uid());

create policy "students_self" on public.students for select using (profile_id=auth.uid());
create policy "teachers_self" on public.teachers for select using (profile_id=auth.uid());
create policy "groups_read_auth" on public.groups for select using (auth.uid() is not null);
create policy "attendance_student" on public.attendance for select using (
  exists(select 1 from public.students s where s.id=attendance.student_id and s.profile_id=auth.uid())
);
create policy "results_student" on public.exam_results for select using (
  exists(select 1 from public.students s where s.id=exam_results.student_id and s.profile_id=auth.uid())
);
create policy "notifications_recipient" on public.notifications for select using (recipient_id=auth.uid());
create policy "notifications_read" on public.notifications for update using (recipient_id=auth.uid());
create policy "messages_sender_or_student" on public.messages for select using (sender_id=auth.uid());

-- Admin/teacher management policies should be added through secure SQL functions
-- or carefully designed RLS policies. NEVER expose service_role key in frontend.

-- Password/ID account creation:
-- The browser must NOT create Auth users with the service_role key.
-- Use a Supabase Edge Function with service_role on the server side to:
-- 1) generate the 6-digit student_id (10xxxx or 30xxxx)
-- 2) generate the initial password from the last 6 phone digits
-- 3) create auth user
-- 4) create profiles/students rows
-- 5) return the ID and temporary password to the admin once.
