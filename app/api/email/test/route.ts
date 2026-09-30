import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nowIn } from "@/lib/dates";
import { loadUserData, loadUserTasks } from "@/lib/server-data";
import { dailySummary, splitTasks } from "@/lib/summary";
import { sendEmail } from "@/lib/email";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { data: s } = await supabase.from("user_settings").select("timezone").maybeSingle();
    const tz = s?.timezone || "America/Caracas";
    const { key: today } = nowIn(tz);
    const { habits, logs } = await loadUserData(supabase, user.id, today);
    const tasks = splitTasks(await loadUserTasks(supabase, user.id, today), today, tz);
    const { subject, html } = dailySummary(habits, logs, today, tasks);
    await sendEmail(user.email, subject, html);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
