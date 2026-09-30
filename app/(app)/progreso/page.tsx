"use client";

import Link from "next/link";
import { hc, StreakBadge } from "@/components/HabitRow";
import { useHabits } from "@/components/HabitsProvider";
import { DOW, addDays, dayOfMonth, weekday } from "@/lib/dates";
import { avg, bestStreak, cellState, completionRate, dayRatio, streak } from "@/lib/habits";

export default function Progress() {
  const { ready, habits, logs, today } = useHabits();
  if (!ready) return <div className="skeleton" style={{ marginTop: 40, height: 200 }} />;

  const last7 = [...Array(7)].map((_, i) => addDays(today, i - 6));
  const prev7 = [...Array(7)].map((_, i) => addDays(today, i - 13));
  const todayRatio = dayRatio(logs, habits, today);
  const curVals = last7.slice(0, 6).map((d) => dayRatio(logs, habits, d));
  if (todayRatio) curVals.push(todayRatio);
  const cur = Math.round(avg(curVals) * 100);
  const prv = Math.round(avg(prev7.map((d) => dayRatio(logs, habits, d))) * 100);
  const dl = cur - prv;

  let perfect = 0;
  for (let i = 1; i < 120; i++) {
    const p = dayRatio(logs, habits, addDays(today, -i));
    if (p === 1) perfect++;
    else if (p !== null) break;
  }
  const r30 = Math.round(avg(habits.map((h) => completionRate(logs, h, today, 30) / 100)) * 100);
  const top = habits
    .map((h) => ({ h, s: streak(logs, h, today) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  return (
    <>
      <div className="top">
        <div>
          <p className="eyebrow">últimos 7 días</p>
          <h1 className="title">Progreso</h1>
        </div>
      </div>

      {!habits.length ? (
        <div className="empty">Crea un hábito y aquí verás tu semana.</div>
      ) : (
        <>
          <div className="card">
            <div className="hero-stat">
              <span className="big num">{cur}%</span>
              <span className={`delta${dl < 0 ? " neg" : ""}`}>{dl >= 0 ? "+" : ""}{dl} pts vs. semana anterior</span>
            </div>
            <div className="bars">
              {last7.map((d) => {
                const p = dayRatio(logs, habits, d) ?? 0;
                return (
                  <div key={d}>
                    <span className={d === today ? "today" : ""} style={{ height: Math.max(3, p * 70) }} />
                    <em>{DOW[weekday(d)]}</em>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-label"><span>Semana por hábito</span></div>
          <div className="card" style={{ overflowX: "auto" }}>
            <div className="grid7">
              <span />
              {last7.map((d) => (
                <span key={d} className="h">{DOW[weekday(d)]}<br />{dayOfMonth(d)}</span>
              ))}
              {habits.map((h) => (
                <div key={h.id} style={{ display: "contents" }}>
                  <span className="nm" style={hc(h)}><i />{h.name}</span>
                  {last7.map((d) => (
                    <span key={d} className={`cell ${cellState(logs, h, d, today)}`} style={hc(h)} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="section-label"><span>Rachas más largas hoy</span></div>
          <div className="list">
            {top.map(({ h, s }) => (
              <Link key={h.id} href={`/habito/${h.id}`} className="habit" style={{ ...hc(h), gridTemplateColumns: "1fr auto" }}>
                <span className="meta">
                  <strong>{h.name}</strong>
                  <span className="cue">Mejor: {bestStreak(logs, h, today)} días · {completionRate(logs, h, today, 30)}% en 30 días</span>
                </span>
                <StreakBadge n={s} />
              </Link>
            ))}
          </div>

          <div className="section-label"><span>La regla del 1%</span></div>
          <div className="card compound">
            Cumplimiento promedio en 30 días: <b>{r30}%</b>. Días seguidos con todo cumplido: <b>{perfect}</b>. Mejorar 1% cada día durante un año te deja <b>37 veces</b> mejor; empeorar 1% te deja casi en cero.
          </div>
        </>
      )}
    </>
  );
}
