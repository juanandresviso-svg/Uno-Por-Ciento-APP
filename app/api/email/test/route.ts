import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nowIn } from "@/lib/dates";
import { loadUserData } from "@/lib/server-data";
import { dailySummary } from "@/lib/summary";
import { sendEmail } from "@/lib/email";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { data: s } = await supabase.from("user_settings").select("timezone").maybeSingle();
    const { key: today } = nowIn(s?.timezone || "America/Caracas");
    const { habits, logs } = await loadUserData(supabase, user.id, today);
    const { subject, html } = dailySummary(habits, logs, today);
    await sendEmail(user.email, subject, html);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
