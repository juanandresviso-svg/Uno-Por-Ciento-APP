-- Uno por Ciento · Fase 2: Tareas
-- Pega este archivo completo en Supabase → SQL Editor → Run. Se puede correr más de una vez.

-- ─────────────────────────── Proyectos / áreas ───────────────────────────
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  color        text not null default 'mar',
  position     int  not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id) where archived_at is null;

-- ─────────────────────────── Tareas ───────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  project_id  uuid references public.projects on delete set null,
  title       text not null check (char_length(title) between 1 and 200),
  notes       text not null default '',
  priority    smallint not null default 2 check (priority between 1 and 3),  -- 1 alta · 2 media · 3 baja
  due_date    date,
  due_time    time,
  remind      boolean not null default false,   -- push a la fecha y hora de la tarea
  someday     boolean not null default false,
  done_at     timestamptz,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_open_idx on public.tasks (user_id, due_date) where done_at is null;
create index if not exists tasks_done_idx on public.tasks (user_id, done_at) where done_at is not null;

-- ─────────────────────────── Subtareas ───────────────────────────
create table if not exists public.subtasks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  done        boolean not null default false,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists subtasks_task_idx on public.subtasks (task_id);

-- ─────────────────────────── Ajustes nuevos ───────────────────────────
alter table public.user_settings add column if not exists task_digest       boolean not null default true;
alter table public.user_settings add column if not exists task_digest_time  time    not null default '08:00';
alter table public.user_settings add column if not exists projects_seeded   boolean not null default false;

-- ─────────────────────────── Seguridad (RLS) ───────────────────────────
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.subtasks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['projects', 'tasks', 'subtasks'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Una tarea solo puede apuntar a un proyecto propio; una subtarea, a una tarea propia.
create or replace function public.check_task_refs() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'tasks' then
    if new.project_id is not null and not exists
       (select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id) then
      raise exception 'project does not belong to user';
    end if;
    new.updated_at := now();
  else
    if not exists (select 1 from public.tasks t where t.id = new.task_id and t.user_id = new.user_id) then
      raise exception 'task does not belong to user';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists tasks_refs on public.tasks;
create trigger tasks_refs before insert or update on public.tasks
  for each row execute function public.check_task_refs();

drop trigger if exists subtasks_refs on public.subtasks;
create trigger subtasks_refs before insert or update on public.subtasks
  for each row execute function public.check_task_refs();
