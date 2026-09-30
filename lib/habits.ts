import { addDays, weekday } from "./dates";
import type { Habit, LogMap } from "./types";

export const val = (logs: LogMap, h: Habit, day: string) => logs[h.id]?.[day] ?? 0;
export const isDone = (logs: LogMap, h: Habit, day: string) => val(logs, h, day) >= h.target;
export const isScheduled = (h: Habit, day: string) => h.days.includes(weekday(day));
export const hasStarted = (h: Habit, day: string) => day >= h.start_date;

/** Racha actual: días programados cumplidos seguidos. Si hoy toca y aún no está hecho, no rompe la racha. */
export function streak(logs: LogMap, h: Habit, today: string) {
  let n = 0;
  let d = today;
  if (isScheduled(h, d) && !isDone(logs, h, d)) d = addDays(d, -1);
  for (let i = 0; i < 1000; i++) {
    if (!hasStarted(h, d)) break;
    if (isScheduled(h, d)) {
      if (isDone(logs, h, d)) n++;
      else break;
    }
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(logs: LogMap, h: Habit, today: string) {
  let best = 0;
  let cur = 0;
  for (let d = h.start_date; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    if (isDone(logs, h, d)) {
      cur++;
      best = Math.max(best, cur);
    } else if (d !== today) cur = 0;
  }
  return best;
}

/** % cumplido en los últimos N días (hoy cuenta solo si ya está hecho). */
export function completionRate(logs: LogMap, h: Habit, today: string, days: number) {
  let s = 0;
  let ok = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (!hasStarted(h, d)) break;
    if (!isScheduled(h, d)) continue;
    if (i === 0 && !isDone(logs, h, d)) continue;
    s++;
    if (isDone(logs, h, d)) ok++;
  }
  return s ? Math.round((ok / s) * 100) : 0;
}

export const totalDone = (logs: LogMap, h: Habit) =>
  Object.values(logs[h.id] ?? {}).filter((v) => v >= h.target).length;

/** ¿Se falló el último día programado antes de hoy? (regla "nunca falles dos veces") */
export function missedLast(logs: LogMap, h: Habit, today: string) {
  let d = addDays(today, -1);
  for (let i = 0; i < 7; i++) {
    if (!hasStarted(h, d)) return false;
    if (isScheduled(h, d)) return !isDone(logs, h, d);
    d = addDays(d, -1);
  }
  return false;
}

export type CellState = "d" | "p" | "n" | "f" | "";
export function cellState(logs: LogMap, h: Habit, day: string, today: string): CellState {
  if (day > today || !hasStarted(h, day)) return "f";
  if (!isScheduled(h, day)) return "n";
  if (isDone(logs, h, day)) return "d";
  if (val(logs, h, day) > 0) return "p";
  return "";
}

/** Fracción de hábitos cumplidos en un día (null si no tocaba ninguno). */
export function dayRatio(logs: LogMap, habits: Habit[], day: string) {
  const hs = habits.filter((h) => isScheduled(h, day) && hasStarted(h, day));
  if (!hs.length) return null;
  return hs.filter((h) => isDone(logs, h, day)).length / hs.length;
}

export function avg(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

export function logsToMap(rows: { habit_id: string; day: string; value: number }[]): LogMap {
  const m: LogMap = {};
  for (const r of rows) (m[r.habit_id] ??= {})[r.day] = r.value;
  return m;
}
