import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./dates";
import { logsToMap } from "./habits";
import type { Habit, Project, Task } from "./types";

/** Hábitos activos y registros recientes de un usuario. */
export async function loadUserData(db: SupabaseClient, userId: string, today: string, historyDays = 120) {
  const [h, l] = await Promise.all([
    db.from("habits").select("*").eq("user_id", userId).is("archived_at", null).order("position"),
    db.from("habit_logs").select("habit_id, day, value").eq("user_id", userId).gte("day", addDays(today, -historyDays)),
  ]);
  if (h.error) throw h.error;
  if (l.error) throw l.error;
  return { habits: (h.data ?? []) as Habit[], logs: logsToMap(l.data ?? []) };
}

/** Tareas abiertas con fecha hasta mañana, más las completadas hoy (para el resumen). */
export async function loadUserTasks(db: SupabaseClient, userId: string, today: string) {
  const since = new Date(Date.now() - 36 * 3_600_000).toISOString();
  const [open, done, projects] = await Promise.all([
    db.from("tasks").select("*").eq("user_id", userId).is("done_at", null).not("due_date", "is", null).lte("due_date", addDays(today, 1)),
    db.from("tasks").select("*").eq("user_id", userId).gte("done_at", since),
    db.from("projects").select("*").eq("user_id", userId).is("archived_at", null),
  ]);
  if (open.error) {
    // Si todavía no se corrió la migración de tareas, los hábitos siguen funcionando.
    console.error("tasks", open.error.message);
    return { open: [] as Task[], done: [] as Task[], projects: [] as Project[] };
  }
  const fix = (t: Task) => ({ ...t, due_time: t.due_time?.slice(0, 5) ?? null });
  return {
    open: ((open.data ?? []) as Task[]).map(fix),
    done: ((done.data ?? []) as Task[]).map(fix),
    projects: (projects.data ?? []) as Project[],
  };
}
