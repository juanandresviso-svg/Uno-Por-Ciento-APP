import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  habitId?: string;
  taskId?: string;
  actions?: { action: string; title: string }[];
}

/** Limpia una clave pegada con espacios, saltos de línea, comillas, "=" o en base64 normal. */
export function cleanKey(k: string | undefined) {
  if (!k) return k;
  return k
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let configured = false;
function configure() {
  if (configured) return;
  const pub = cleanKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const priv = cleanKey(process.env.VAPID_PRIVATE_KEY);
  if (!pub || !priv) throw new Error("Faltan las claves VAPID");
  let subject = (process.env.VAPID_SUBJECT || "").trim().replace(/^["']+|["']+$/g, "");
  if (!/^(mailto:|https:)/.test(subject)) subject = subject.includes("@") ? `mailto:${subject}` : "mailto:juanandresviso@gmail.com";
  try {
    webpush.setVapidDetails(subject, pub, priv);
  } catch (e) {
    throw new Error(`Clave VAPID inválida en Vercel (${(e as Error).message}). Vuelve a pegar NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY sin espacios ni comillas.`);
  }
  configured = true;
}

/** Envía a todos los teléfonos del usuario. Borra suscripciones vencidas. Devuelve cuántos recibieron. */
export async function sendPushToUser(db: SupabaseClient, userId: string, payload: PushPayload) {
  configure();
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  let ok = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60, urgency: "high" }
      );
      ok++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("push error", code, (e as Error).message);
    }
  }
  return ok;
}
