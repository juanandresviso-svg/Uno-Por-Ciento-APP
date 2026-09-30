import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./dates";
import { logsToMap } from "./habits";
import type { Habit } from "./types";

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
