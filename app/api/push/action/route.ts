import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nowIn } from "@/lib/dates";

// Botones de la notificación: "Hecho" marca el hábito, "En 30 min" pospone el aviso.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { habitId, action } = (await req.json().catch(() => ({}))) as { habitId?: string; action?: string };
  if (!habitId || !["done", "later"].includes(action ?? "")) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

  const { data: habit } = await supabase.from("habits").select("id, target").eq("id", habitId).maybeSingle();
  if (!habit) return NextResponse.json({ error: "Hábito no encontrado" }, { status: 404 });

  const { data: s } = await supabase.from("user_settings").select("timezone").maybeSingle();
  const { key: today } = nowIn(s?.timezone || "America/Caracas");

  if (action === "done") {
    const { error } = await supabase
      .from("habit_logs")
      .upsert({ habit_id: habitId, day: today, value: habit.target }, { onConflict: "habit_id,day" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const admin = createAdminClient();
    await admin.from("notification_log").delete().match({ user_id: user.id, kind: "habit", ref: habitId, day: today });
    await admin
      .from("notification_log")
      .upsert({ user_id: user.id, kind: "snooze", ref: habitId, day: today, sent_at: new Date().toISOString() }, { onConflict: "user_id,kind,ref,day" });
  }
  return NextResponse.json({ ok: true });
}
