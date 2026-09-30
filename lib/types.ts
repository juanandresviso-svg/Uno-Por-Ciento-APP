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
};
