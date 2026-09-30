import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nowIn } from "@/lib/dates";

// Botones de la notificación: "Hecho" marca el hábito o la tarea; "En 30 min" pospone el aviso.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { habitId, taskId, action } = (await req.json().catch(() => ({}))) as { habitId?: string; taskId?: string; action?: string };
  if ((!habitId && !taskId) || !["done", "later"].includes(action ?? "")) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const { data: s } = await supabase.from("user_settings").select("timezone").maybeSingle();
  const { key: today } = nowIn(s?.timezone || "America/Caracas");

  // Pospone: borra la marca de "ya avisado" y deja un snooze con la hora actual.
  async function snooze(kind: string, snoozeKind: string, ref: string) {
    const admin = createAdminClient();
    await admin.from("notification_log").delete().match({ user_id: user!.id, kind, ref, day: today });
    await admin
      .from("notification_log")
      .upsert({ user_id: user!.id, kind: snoozeKind, ref, day: today, sent_at: new Date().toISOString() }, { onConflict: "user_id,kind,ref,day" });
  }

  if (taskId) {
    const { data: task } = await supabase.from("tasks").select("id").eq("id", taskId).maybeSingle();
    if (!task) return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    if (action === "done") {
      const { error } = await supabase.from("tasks").update({ done_at: new Date().toISOString() }).eq("id", taskId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      await snooze("task", "task-snooze", taskId);
    }
    return NextResponse.json({ ok: true });
  }

  const { data: habit } = await supabase.from("habits").select("id, target").eq("id", habitId!).maybeSingle();
  if (!habit) return NextResponse.json({ error: "Hábito no encontrado" }, { status: 404 });

  if (action === "done") {
    const { error } = await supabase
      .from("habit_logs")
      .upsert({ habit_id: habitId, day: today, value: habit.target }, { onConflict: "habit_id,day" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    await snooze("habit", "snooze", habitId!);
  }
  return NextResponse.json({ ok: true });
}
