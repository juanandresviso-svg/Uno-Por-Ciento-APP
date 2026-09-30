import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const n = await sendPushToUser(supabase, user.id, {
      title: "Uno por Ciento",
      body: "Así se ven tus recordatorios. Todo listo.",
      url: "/",
      tag: "test",
    });
    if (!n) return NextResponse.json({ error: "No hay teléfonos registrados" }, { status: 400 });
    return NextResponse.json({ ok: true, sent: n });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
