"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useHabits } from "@/components/HabitsProvider";
import { IconBack } from "@/components/Icons";
import { fmtTime, hhmm } from "@/lib/dates";
import { isScheduled } from "@/lib/habits";
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported } from "@/lib/push-client";
import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/types";

type PushState = "cargando" | "no-soportado" | "instalar" | "apagado" | "activo" | "bloqueado";

export default function SettingsPage() {
  const { email, settings, updateSettings, habits, today, toast } = useHabits();
  const router = useRouter();
  const [push, setPush] = useState<PushState>("cargando");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (isIOS() && !isStandalone()) return setPush("instalar");
      if (!pushSupported()) return setPush("no-soportado");
      if (Notification.permission === "denied") return setPush("bloqueado");
      setPush((await currentSubscription()) ? "activo" : "apagado");
    })();
  }, []);

  const sw = (key: keyof Settings, label: string) => (
    <button
      className="switch ctl"
      role="switch"
      aria-checked={!!settings[key]}
      aria-label={label}
      onClick={() => updateSettings({ [key]: !settings[key] } as Partial<Settings>)}
    />
  );

  async function togglePush() {
    setBusy(true);
    if (push === "activo") {
      await disablePush();
      setPush("apagado");
      toast("Este teléfono ya no recibe avisos");
    } else {
      const err = await enablePush();
      if (err) toast(err);
      else {
        setPush("activo");
        toast("Avisos activados en este teléfono");
      }
    }
    setBusy(false);
  }

  async function post(url: string, ok: string) {
    setBusy(true);
    const res = await fetch(url, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    toast(res.ok ? ok : data.error ?? "Algo falló");
    setBusy(false);
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  const withRem = habits
    .filter((h) => h.remind && h.remind_time && isScheduled(h, today))
    .sort((a, b) => (a.remind_time ?? "").localeCompare(b.remind_time ?? ""));

  const pushHelp: Record<PushState, string> = {
    cargando: "Revisando…",
    "no-soportado": "Este navegador no permite notificaciones",
    instalar: "En iPhone: Compartir → Agregar a inicio, y abre la app desde ahí",
    apagado: "Toca para activar los avisos en este teléfono",
    activo: "Activo en este teléfono",
    bloqueado: "Bloqueadas. Actívalas en los ajustes del teléfono",
  };

  return (
    <>
      <Link className="back" href="/"><IconBack />Hoy</Link>
      <div className="top" style={{ marginTop: 6 }}>
        <div>
          <p className="eyebrow">{email}</p>
          <h1 className="title">Ajustes</h1>
        </div>
      </div>

      <div className="section-label"><span>Recordatorios en el teléfono</span></div>
      <div className="card flush">
        <div className="set">
          <b>Avisos en este teléfono</b>
          <small>{pushHelp[push]}</small>
          <button
            className="switch ctl"
            role="switch"
            aria-checked={push === "activo"}
            aria-label="Avisos en este teléfono"
            disabled={busy || !["apagado", "activo"].includes(push)}
            onClick={togglePush}
          />
        </div>
        <div className="set">
          <b>Recordatorios de hábitos</b>
          <small>Si a la hora del hábito no lo has marcado, te aviso</small>
          {sw("push_enabled", "Recordatorios de hábitos")}
        </div>
        <div className="set">
          <b>Silencio nocturno</b>
          <small>Nada entre {fmtTime(settings.quiet_start)} y {fmtTime(settings.quiet_end)}</small>
          {sw("quiet_enabled", "Silencio nocturno")}
        </div>
        <div className="set single">
          <b>Programados hoy</b>
          <small>
            {withRem.length
              ? withRem.map((h) => <span key={h.id} style={{ display: "block" }}>{fmtTime(h.remind_time)} · {h.name}</span>)
              : "Ningún hábito con recordatorio hoy"}
          </small>
        </div>
        <div className="set single">
          <button className="btn" disabled={busy || push !== "activo"} onClick={() => post("/api/push/test", "Aviso de prueba enviado")}>
            Enviar un aviso de prueba
          </button>
        </div>
      </div>

      <div className="section-label"><span>Correo</span></div>
      <div className="card flush">
        <div className="set">
          <b>Resumen del día</b>
          <small>
            Lo que cumpliste y lo que falta, a las{" "}
            <input
              type="time"
              id="daily-time"
              className="timein"
              value={hhmm(settings.daily_email_time)}
              onChange={(e) => e.target.value && updateSettings({ daily_email_time: e.target.value })}
              aria-label="Hora del resumen"
            />
          </small>
          {sw("daily_email", "Resumen del día")}
        </div>
        <div className="set">
          <b>Revisión semanal</b>
          <small>Domingo 6:00 pm, con tu semana por hábito</small>
          {sw("weekly_email", "Revisión semanal")}
        </div>
        <div className="set single">
          <button className="btn" disabled={busy} onClick={() => post("/api/email/test", `Resumen enviado a ${email}`)}>
            Enviarme el resumen ahora
          </button>
        </div>
      </div>

      <div className="section-label"><span>Próximos módulos</span></div>
      <div className="card soonlist">
        <div><b>Tareas</b><span className="chip">Fase 2</span></div>
        <div><b>Finanzas</b><span className="chip">Fase 3</span></div>
      </div>

      <div className="row-actions">
        <button className="btn danger" onClick={logout}>Cerrar sesión</button>
      </div>
      <p className="hint" style={{ textAlign: "center" }}>Zona horaria: {settings.timezone}</p>
    </>
  );
}
