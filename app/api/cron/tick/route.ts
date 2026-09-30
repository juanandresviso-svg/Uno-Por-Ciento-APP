import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nowIn, toMinutes } from "@/lib/dates";
import { isDone, isScheduled, missedLast, streak } from "@/lib/habits";
import { sendPushToUser } from "@/lib/push";
import { loadUserData } from "@/lib/server-data";
import { dailySummary, weeklySummary } from "@/lib/summary";
import { sendEmail } from "@/lib/email";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REMIND_WINDOW = 90; // minutos después de la hora en que todavía vale la pena avisar
const SNOOZE = 30;
const WEEKLY_AT = 18 * 60; // domingo 6:00 pm

function inQuiet(s: Settings, minutes: number) {
  if (!s.quiet_enabled) return false;
  const a = toMinutes(s.quiet_start)!;
  const b = toMinutes(s.quiet_end)!;
  return a <= b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: users, error } = await db.from("user_settings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const report: Record<string, unknown>[] = [];

  for (const s of (users ?? []) as (Settings & { user_id: string })[]) {
    const r: Record<string, unknown> = { user: s.user_id, pushes: 0 };
    try {
      const { key: today, minutes } = nowIn(s.timezone || "America/Caracas");
      const { habits, logs } = await loadUserData(db, s.user_id, today);
      const { data: sentRows } = await db.from("notification_log").select("kind, ref, sent_at").eq("user_id", s.user_id).eq("day", today);
      const sent = new Map((sentRows ?? []).map((x) => [`${x.kind}:${x.ref}`, x.sent_at as string]));

      // Reclama el aviso antes de mandarlo, así dos ejecuciones no lo duplican.
      const claim = async (kind: string, ref = "") => {
        const { data } = await db
          .from("notification_log")
          .upsert({ user_id: s.user_id, kind, ref, day: today }, { onConflict: "user_id,kind,ref,day", ignoreDuplicates: true })
          .select("id");
        return (data?.length ?? 0) > 0;
      };

      // 1) Recordatorios de hábitos
      if (s.push_enabled && !inQuiet(s, minutes)) {
        for (const h of habits) {
          const at = toMinutes(h.remind_time);
          if (!h.remind || at === null || !isScheduled(h, today) || today < h.start_date || isDone(logs, h, today)) continue;
          if (sent.has(`habit:${h.id}`)) continue;
          const snoozedAt = sent.get(`snooze:${h.id}`);
          const due = snoozedAt
            ? Date.now() - new Date(snoozedAt).getTime() >= SNOOZE * 60_000
            : minutes >= at && minutes - at <= REMIND_WINDOW;
          if (!due || !(await claim("habit", h.id))) continue;

          const risk = missedLast(logs, h, today);
          const st = streak(logs, h, today);
          const v = logs[h.id]?.[today] ?? 0;
          const body = risk
            ? "Ayer no se hizo. Hoy no puede ser el segundo día."
            : h.type === "count"
              ? `Vas ${v} de ${h.target} ${h.unit}.${st ? ` Racha: ${st} días.` : ""}`
              : `${h.cue ? h.cue + ". " : ""}${st ? `Llevas ${st} ${st === 1 ? "día" : "días"}.` : "Hoy empieza la racha."}`;
          const n = await sendPushToUser(db, s.user_id, {
            title: h.name,
            body,
            url: `/habito/${h.id}`,
            tag: `habit-${h.id}`,
            habitId: h.id,
            actions: [
              { action: "done", title: "Hecho" },
              { action: "later", title: "En 30 min" },
            ],
          });
          r.pushes = (r.pushes as number) + n;
        }
      }

      // 2) Resumen diario por correo
      const dailyAt = toMinutes(s.daily_email_time)!;
      if (s.daily_email && s.email && minutes >= dailyAt && habits.length && !sent.has("daily:")) {
        if (await claim("daily")) {
          const { subject, html } = dailySummary(habits, logs, today);
          await sendEmail(s.email, subject, html);
          r.daily = true;
        }
      }

      // 3) Revisión semanal (domingo)
      const isSunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;
      if (s.weekly_email && s.email && isSunday && minutes >= WEEKLY_AT && habits.length && !sent.has("weekly:")) {
        if (await claim("weekly")) {
          const { subject, html } = weeklySummary(habits, logs, today);
          await sendEmail(s.email, subject, html);
          r.weekly = true;
        }
      }
    } catch (e) {
      r.error = (e as Error).message;
      console.error("tick", s.user_id, e);
    }
    report.push(r);
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString(), report });
}

export const GET = handler;
export const POST = handler;
