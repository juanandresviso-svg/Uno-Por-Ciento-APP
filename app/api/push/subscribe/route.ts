import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint, p256dh, auth, user_id: user.id, user_agent: req.headers.get("user-agent") }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.endpoint) await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
