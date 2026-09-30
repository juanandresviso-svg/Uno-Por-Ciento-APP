export type HabitType = "check" | "count";
export type DayPart = "mañana" | "tarde" | "noche";
export type HabitColor = "mar" | "sol" | "coral" | "lila" | "cielo";

export interface Habit {
  id: string;
  user_id?: string;
  name: string;
  cue: string;
  type: HabitType;
  target: number;
  unit: string;
  days: number[]; // 0 = domingo
  part: DayPart;
  remind_time: string | null; // "HH:MM" o "HH:MM:SS"
  remind: boolean;
  color: HabitColor;
  position: number;
  start_date: string; // YYYY-MM-DD
  archived_at?: string | null;
}

export interface HabitLog {
  habit_id: string;
  day: string;
  value: number;
}

/** habitId → día → valor */
export type LogMap = Record<string, Record<string, number>>;

export interface Settings {
  user_id?: string;
  email: string | null;
  timezone: string;
  push_enabled: boolean;
  quiet_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  daily_email: boolean;
  daily_email_time: string;
  weekly_email: boolean;
  task_digest: boolean;
  task_digest_time: string;
  projects_seeded?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  email: null,
  timezone: "America/Caracas",
  push_enabled: true,
  quiet_enabled: true,
  quiet_start: "23:00",
  quiet_end: "05:30",
  daily_email: true,
  daily_email_time: "21:30",
  weekly_email: true,
  task_digest: true,
  task_digest_time: "08:00",
};

// ─────────── Fase 2: Tareas ───────────
export type Priority = 1 | 2 | 3; // 1 alta · 2 media · 3 baja

export interface Project {
  id: string;
  name: string;
  color: HabitColor;
  position: number;
  archived_at?: string | null;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  notes: string;
  priority: Priority;
  due_date: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:MM
  remind: boolean;
  someday: boolean;
  done_at: string | null;
  position: number;
  created_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
}
