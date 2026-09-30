"use client";

import Link from "next/link";
import HabitRow from "@/components/HabitRow";
import { useHabits } from "@/components/HabitsProvider";
import { IconGear } from "@/components/Icons";
import { longDate } from "@/lib/dates";
import { isDone, isScheduled, missedLast } from "@/lib/habits";
import type { DayPart } from "@/lib/types";

const PARTS: [DayPart, string][] = [
  ["mañana", "Mañana"],
  ["tarde", "Tarde"],
  ["noche", "Noche"],
];

export default function Today() {
  const { ready, error, habits, logs, today, openForm, reload } = useHabits();
  const todays = habits.filter((h) => isScheduled(h, today));
  const rest = habits.filter((h) => !isScheduled(h, today));
  const done = todays.filter((h) => isDone(logs, h, today)).length;
  const C = 2 * Math.PI * 27;
  const p = todays.length ? done / todays.length : 0;
  const risk = todays.filter((h) => missedLast(logs, h, today) && !isDone(logs, h, today));

  return (
    <>
      <div className="top">
        <div>
          <p className="eyebrow">{longDate(today)}</p>
          <h1 className="title">Hoy</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="dayring" role="img" aria-label={`${done} de ${todays.length} hábitos`}>
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="27" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
              <circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} />
            </svg>
            <span className="lbl">{done}/{todays.length}</span>
          </div>
          <Link className="iconbtn" href="/ajustes" aria-label="Ajustes">
            <IconGear />
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert" role="alert">
          <strong>No se pudieron cargar tus hábitos</strong>
          <span>{error}. <button className="back" style={{ margin: 0 }} onClick={() => reload()}>Reintentar</button></span>
        </div>
      )}

      {!ready ? (
        <div className="list">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      ) : !habits.length ? (
        <div className="empty">
          <p>Todavía no tienes hábitos.</p>
          <button className="btn primary" style={{ flex: "none", padding: "12px 20px" }} onClick={() => openForm()}>
            Crear el primero
          </button>
        </div>
      ) : (
        <>
          {risk.length > 0 && (
            <div className="alert" role="status">
              <strong>Nunca falles dos veces</strong>
              <span>
                Ayer se quedó pendiente <b>{risk.map((h) => h.name).join(" y ")}</b>. Hazlo hoy, aunque sea la versión mínima.
              </span>
            </div>
          )}
          {PARTS.map(([key, label]) => {
            const g = todays.filter((h) => h.part === key).sort((a, b) => (a.remind_time ?? "").localeCompare(b.remind_time ?? ""));
            if (!g.length) return null;
            const gd = g.filter((h) => isDone(logs, h, today)).length;
            return (
              <section key={key}>
                <div className="section-label">
                  <span>{label}</span>
                  <span className="num">{gd}/{g.length}</span>
                </div>
                <div className="list">{g.map((h) => <HabitRow key={h.id} h={h} />)}</div>
              </section>
            );
          })}
          {rest.length > 0 && (
            <section>
              <div className="section-label"><span>No toca hoy</span></div>
              <div className="list">{rest.map((h) => <HabitRow key={h.id} h={h} />)}</div>
            </section>
          )}
        </>
      )}
    </>
  );
}
