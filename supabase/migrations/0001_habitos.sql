-- Uno por Ciento · Fase 1: Hábitos
-- Pega este archivo completo en Supabase → SQL Editor → Run.

create extension if not exists pgcrypto;

-- ─────────────────────────── Hábitos ───────────────────────────
create table if not exists public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  cue          text not null default '',
  type         text not null default 'check' check (type in ('check', 'count')),
  target       int  not null default 1 check (target between 1 and 99),
  unit         text not null default '',
  days         smallint[] not null default '{0,1,2,3,4,5,6}',   -- 0 = domingo … 6 = sábado
  part         text not null default 'mañana' check (part in ('mañana', 'tarde', 'noche')),
  remind_time  time,
  remind       boolean not null default true,
  color        text not null default 'mar',
  position     int  not null default 0,
  start_date   date not null default (now() at time zone 'America/Caracas')::date,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id) where archived_at is null;

-- ─────────────────────────── Registros diarios ───────────────────────────
create table if not exists public.habit_logs (
  habit_id    uuid not null references public.habits on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  day         date not null,
  value       int  not null check (value >= 0),
  updated_at  timestamptz not null default now(),
  primary key (habit_id, day)
);
create index if not exists habit_logs_user_day_idx on public.habit_logs (user_id, day);

-- ─────────────────────────── Ajustes ───────────────────────────
create table if not exists public.user_settings (
  user_id           uuid primary key default auth.uid() references auth.users on delete cascade,
  email             text,
  timezone          text not null default 'America/Caracas',
  push_enabled      boolean not null default true,
  quiet_enabled     boolean not null default true,
  quiet_start       time not null default '23:00',
  quiet_end         time not null default '05:30',
  daily_email       boolean not null default true,
  daily_email_time  time not null default '21:30',
  weekly_email      boolean not null default true,
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────── Suscripciones push ───────────────────────────
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────── Bitácora de avisos (solo servidor) ───────────────────────────
-- Evita mandar el mismo recordatorio o correo dos veces el mismo día.
create table if not exists public.notification_log (
  id       bigserial primary key,
  user_id  uuid not null references auth.users on delete cascade,
  kind     text not null,          -- 'habit' | 'snooze' | 'daily' | 'weekly'
  ref      text not null default '',
  day      date not null,
  sent_at  timestamptz not null default now(),
  unique (user_id, kind, ref, day)
);

-- ─────────────────────────── Seguridad (RLS) ───────────────────────────
alter table public.habits             enable row level security;
alter table public.habit_logs         enable row level security;
alter table public.user_settings      enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log   enable row level security;  -- sin políticas: solo service role

do $$
declare t text;
begin
  foreach t in array array['habits', 'habit_logs', 'user_settings', 'push_subscriptions'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Un registro solo puede apuntar a un hábito del mismo usuario
create or replace function public.check_log_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.habits h where h.id = new.habit_id and h.user_id = new.user_id) then
    raise exception 'habit does not belong to user';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists habit_logs_owner on public.habit_logs;
create trigger habit_logs_owner before insert or update on public.habit_logs
  for each row execute function public.check_log_owner();
