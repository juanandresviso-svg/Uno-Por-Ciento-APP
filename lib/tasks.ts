import { DIA, MES, addDays, dayOfMonth, fmtTime, monthIdx, weekday } from "./dates";
import type { Task } from "./types";

export type Bucket = "vencidas" | "hoy" | "proximas" | "bandeja" | "algun-dia" | "hechas";

export const PRIORITY_LABEL: Record<number, string> = { 1: "Alta", 2: "Media", 3: "Baja" };
export const PRIORITY_COLOR: Record<number, string> = { 1: "var(--h-coral)", 2: "var(--h-sol)", 3: "var(--faint)" };

export function bucketOf(t: Task, today: string): Bucket {
  if (t.done_at) return "hechas";
  if (t.someday) return "algun-dia";
  if (!t.due_date) return "bandeja";
  if (t.due_date < today) return "vencidas";
  if (t.due_date === today) return "hoy";
  return "proximas";
}

/** Orden: vencidas más viejas primero, luego por hora, prioridad y creación. */
export function compareTasks(a: Task, b: Task) {
  const da = a.due_date ?? "9999-12-31";
  const db = b.due_date ?? "9999-12-31";
  if (da !== db) return da < db ? -1 : 1;
  const ta = a.due_time ?? "99:99";
  const tb = b.due_time ?? "99:99";
  if (ta !== tb) return ta < tb ? -1 : 1;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.created_at < b.created_at ? -1 : 1;
}

export function daysBetween(from: string, to: string) {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function shortDate(day: string) {
  return `${dayOfMonth(day)} ${MES[monthIdx(day)]}`;
}

/** "Hoy 3:00 pm", "Mañana", "Vencida hace 2 días", "viernes", "12 oct". */
export function dueLabel(t: Task, today: string) {
  if (!t.due_date) return t.someday ? "Algún día" : "";
  const n = daysBetween(today, t.due_date);
  const time = t.due_time ? ` ${fmtTime(t.due_time)}` : "";
  if (n < 0) return n === -1 ? "Venció ayer" : `Vencida hace ${-n} días`;
  if (n === 0) return `Hoy${time}`;
  if (n === 1) return `Mañana${time}`;
  if (n < 7) return `${DIA[weekday(t.due_date)]}${time}`;
  return `${shortDate(t.due_date)}${time}`;
}

/** Encabezado de grupo en Próximas. */
export function dayHeading(day: string, today: string) {
  const n = daysBetween(today, day);
  if (n === 1) return "Mañana";
  if (n < 7) return `${DIA[weekday(day)]} ${dayOfMonth(day)}`;
  return shortDate(day);
}

export const tomorrow = (today: string) => addDays(today, 1);
