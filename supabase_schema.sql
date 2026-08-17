-- EduCenter / Edu-Sorour - Supabase schema
-- Safe to run on a new project OR over the current EduCenter v2 schema.
-- IMPORTANT: never put a service_role/secret key in the frontend.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Types
-- ---------------------------------------------------------
do $$
begin
  create type public.app_role as enum ('admin','teacher','student');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------
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
  group_type text not null default 'main' check (group_type in ('main','solution')),
  grade text,
  teacher_id uuid references public.teachers(id) on delete set null,
  day1 text,
  day2 text,
  day3 text,
  start_time time,
  end_time time,
  duration_minutes integer,
  active boolean not null default true,
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
  solution_group_id uuid references public.groups(id) on delete set null,
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

-- ---------------------------------------------------------
-- Upgrade an older EduCenter schema in-place
-- ---------------------------------------------------------
alter table public.groups add column if not exists group_type text;
alter table public.groups add column if not exists day1 text;
alter table public.groups add column if not exists day2 text;
alter table public.groups add column if not exists day3 text;
alter table public.groups add column if not exists start_time time;
alter table public.groups add column if not exists end_time time;
alter table public.groups add column if not exists duration_minutes integer;
alter table public.groups add column if not exists active boolean;

-- Repair legacy solution groups whose name identifies them as solution sessions.
-- Older databases may have stored these rows with group_type = 'main' or NULL.
update public.groups
set group_type = 'solution'
where lower(coalesce(name, '')) like '%مجموعة الحل%';

update public.groups set group_type = 'main' where group_type is null;
update public.groups set active = true where active is null;

alter table public.groups alter column group_type set default 'main';
alter table public.groups alter column group_type set not null;
alter table public.groups alter column active set default true;
alter table public.groups alter column active set not null;

alter table public.students add column if not exists solution_group_id uuid;

-- Existing group_id FK keeps the exact constraint name used by app.js.
-- Add the missing solution-group FK with the exact name expected by PostgREST.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_solution_group_id_fkey'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_solution_group_id_fkey
      foreign key (solution_group_id)
      references public.groups(id)
      on delete set null;
  end if;
end $$;

-- If an old schema used a differently named FK for group_id, make sure the
-- exact PostgREST relationship name required by app.js exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_group_id_fkey'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_group_id_fkey
      foreign key (group_id)
      references public.groups(id)
      on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------
create index if not exists idx_profiles_student_id on public.profiles(student_id);
create index if not exists idx_students_student_id on public.students(student_id);
create index if not exists idx_students_group_id on public.students(group_id);
create index if not exists idx_students_solution_group_id on public.students(solution_group_id);
create index if not exists idx_groups_grade_type on public.groups(grade, group_type);
create index if not exists idx_attendance_student_date on public.attendance(student_id, class_date desc);
create index if not exists idx_exam_results_student on public.exam_results(student_id);
create index if not exists idx_notifications_recipient on public.notifications(recipient_id, created_at desc);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------
-- RLS helper: avoids recursive policy checks on profiles.
-- ---------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role in ('admin','teacher')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------
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

-- Remove policies from the original v2 schema so this script can be rerun safely.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','teachers','groups','students','attendance','exams',
        'exam_results','monthly_evaluations','notifications',
        'conversations','messages','audit_logs'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Profiles
create policy profiles_select_self_or_staff
  on public.profiles for select
  using (id = auth.uid() or public.is_staff());

create policy profiles_update_self_or_admin
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_insert_admin
  on public.profiles for insert
  with check (public.is_admin());

-- Teachers
create policy teachers_select_self_or_staff
  on public.teachers for select
  using (profile_id = auth.uid() or public.is_staff());

create policy teachers_manage_admin
  on public.teachers for all
  using (public.is_admin())
  with check (public.is_admin());

-- Groups
create policy groups_select_auth
  on public.groups for select
  using (auth.uid() is not null);

create policy groups_manage_staff
  on public.groups for all
  using (public.is_staff())
  with check (public.is_staff());

-- Students
create policy students_select_self_or_staff
  on public.students for select
  using (profile_id = auth.uid() or public.is_staff());

create policy students_manage_staff
  on public.students for all
  using (public.is_staff())
  with check (public.is_staff());

-- Attendance
create policy attendance_select_self_or_staff
  on public.attendance for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy attendance_manage_staff
  on public.attendance for all
  using (public.is_staff())
  with check (public.is_staff());

-- Exams
create policy exams_select_auth
  on public.exams for select
  using (auth.uid() is not null);

create policy exams_manage_staff
  on public.exams for all
  using (public.is_staff())
  with check (public.is_staff());

-- Exam results
create policy results_select_self_or_staff
  on public.exam_results for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.students s
      where s.id = exam_results.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy results_manage_staff
  on public.exam_results for all
  using (public.is_staff())
  with check (public.is_staff());

-- Monthly evaluations
create policy evaluations_select_self_or_staff
  on public.monthly_evaluations for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.students s
      where s.id = monthly_evaluations.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy evaluations_manage_staff
  on public.monthly_evaluations for all
  using (public.is_staff())
  with check (public.is_staff());

-- Notifications
create policy notifications_select_recipient_or_staff
  on public.notifications for select
  using (recipient_id = auth.uid() or public.is_staff());

create policy notifications_update_recipient_or_staff
  on public.notifications for update
  using (recipient_id = auth.uid() or public.is_staff())
  with check (recipient_id = auth.uid() or public.is_staff());

create policy notifications_insert_staff
  on public.notifications for insert
  with check (public.is_staff());

create policy notifications_delete_staff
  on public.notifications for delete
  using (public.is_staff());

-- Conversations / messages
create policy conversations_select_participant_or_staff
  on public.conversations for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.students s
      where s.id = conversations.student_id
        and s.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.teachers t
      where t.id = conversations.teacher_id
        and t.profile_id = auth.uid()
    )
  );

create policy conversations_manage_staff
  on public.conversations for all
  using (public.is_staff())
  with check (public.is_staff());

create policy messages_select_participant_or_staff
  on public.messages for select
  using (
    public.is_staff()
    or sender_id = auth.uid()
    or exists (
      select 1
      from public.conversations c
      join public.students s on s.id = c.student_id
      join public.teachers t on t.id = c.teacher_id
      where c.id = messages.conversation_id
        and (s.profile_id = auth.uid() or t.profile_id = auth.uid())
    )
  );

create policy messages_insert_sender_or_staff
  on public.messages for insert
  with check (sender_id = auth.uid() or public.is_staff());

create policy messages_update_sender_or_staff
  on public.messages for update
  using (sender_id = auth.uid() or public.is_staff())
  with check (sender_id = auth.uid() or public.is_staff());

-- Audit logs: staff can read/write; regular users cannot.
create policy audit_logs_staff
  on public.audit_logs for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------
-- Notes for account creation
-- ---------------------------------------------------------
-- The browser must NOT create Auth users with a service_role/secret key.
-- If you use the existing create-student Edge Function, keep it server-side.
-- It should create the auth user, profiles row and students row, then return
-- only the non-secret student credentials needed by the admin.
