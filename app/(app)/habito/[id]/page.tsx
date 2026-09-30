"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { hc } from "@/components/HabitRow";
import { useHabits } from "@/components/HabitsProvider";
import { IconBack } from "@/components/Icons";
import { DOW, DOW_ORDER, MES, addDays, dayOfMonth, fmtTime, monthIdx, weekday } from "@/lib/dates";
import { bestStreak, cellState, completionRate, hasStarted, isDone, isScheduled, streak, totalDone } from "@/lib/habits";

const WEEKS = 18;

export default function HabitDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, habits, logs, today, setDay, openForm, archiveHabit, updateHabit } = useHabits();
  const [confirm, setConfirm] = useState(false);
  const h = habits.find((x) => x.id === id);

  if (!ready) return <div className="skeleton" style={{ marginTop: 40, height: 200 }} />;
  if (!h)
    return (
      <div className="empty">
        <p>Este hábito ya no existe.</p>
        <Link className="back" href="/">Volver a Hoy</Link>
      </div>
    );

  const st = streak(logs, h, today);
  const startMon = addDays(today, -((weekday(today) + 6) % 7) - 7 * (WEEKS - 1));
  const months: string[] = [];
  const cells: { day: string; c: string; editable: boolean }[] = [];
  let lastM = -1;
  for (let w = 0; w < WEEKS; w++) {
    const wd = addDays(startMon, w * 7);
    let lab = "";
    for (let i = 0; i < 7; i++) {
      const x = addDays(wd, i);
      if (monthIdx(x) !== lastM && dayOfMonth(x) <= 7) {
        lab = MES[monthIdx(x)];
        lastM = monthIdx(x);
        break;
      }
    }
    months.push(lab);
    for (let i = 0; i < 7; i++) {
      const day = addDays(wd, i);
      cells.push({
        day,
        c: cellState(logs, h, day, today),
        editable: day <= today && isScheduled(h, day) && hasStarted(h, day),
      });
    }
  }

  const toggle = (day: string) => setDay(h, day, isDone(logs, h, day) ? 0 : h.target);

  return (
    <div style={hc(h)}>
      <Link className="back" href="/"><IconBack />Hoy</Link>
      <h1 className="title" style={{ fontSize: 30, marginTop: 6 }}>{h.name}</h1>
      <p className="muted" style={{ margin: "8px 0 0" }}>
        {h.cue ? `${h.cue}, ` : ""}
        {h.remind_time ? `a las ${fmtTime(h.remind_time)}` : "sin hora fija"}
        {h.type === "count" ? ` · meta ${h.target} ${h.unit}` : ""}
      </p>
      <div className="chips">
        {DOW_ORDER.map((i) => (
          <span key={i} className={`chip${h.days.includes(i) ? " on" : ""}`}>{DOW[i]}</span>
        ))}
      </div>

      <div className="stats">
        <div className="stat"><div className="v">{st} <small>días</small></div><div className="k">Racha actual</div></div>
        <div className="stat"><div className="v">{bestStreak(logs, h, today)} <small>días</small></div><div className="k">Mejor racha</div></div>
        <div className="stat"><div className="v">{completionRate(logs, h, today, 30)}<small>%</small></div><div className="k">Últimos 30 días</div></div>
        <div className="stat"><div className="v">{totalDone(logs, h)}</div><div className="k">Veces cumplido</div></div>
      </div>

      <div className="section-label"><span>Últimas {WEEKS} semanas</span></div>
      <div className="card">
        <div className="heat-wrap">
          <div className="months">{months.map((m, i) => <span key={i}>{m}</span>)}</div>
          <div className="heatrow">
            <div className="wdl">{DOW_ORDER.map((i, j) => <span key={i}>{j % 2 === 0 ? DOW[i] : ""}</span>)}</div>
            <div className="heat">
              {cells.map(({ day, c, editable }) => (
                <button
                  key={day}
                  className={`${c}${day === today ? " t" : ""}`}
                  disabled={!editable}
                  tabIndex={editable ? 0 : -1}
                  title={`${dayOfMonth(day)} ${MES[monthIdx(day)]}`}
                  aria-label={`${dayOfMonth(day)} ${MES[monthIdx(day)]}${c === "d" ? ", cumplido" : ""}`}
                  onClick={() => editable && toggle(day)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="hint">Toca un día para marcarlo o desmarcarlo si se te olvidó registrarlo.</p>

      <div className="section-label"><span>Recordatorio</span></div>
      <div className="card flush">
        <div className="set">
          <b>{h.remind_time ? fmtTime(h.remind_time) : "Sin hora"}</b>
          <small>{h.remind && h.remind_time ? "Te aviso si a esa hora no lo has marcado" : "Sin aviso"}</small>
          <button className="switch ctl" role="switch" aria-checked={h.remind} aria-label="Recordatorio" onClick={() => updateHabit(h.id, { remind: !h.remind })} />
        </div>
      </div>

      <div className="row-actions">
        <button className="btn" onClick={() => openForm(h)}>Editar</button>
        <button
          className="btn danger"
          onClick={async () => {
            if (!confirm) {
              setConfirm(true);
              setTimeout(() => setConfirm(false), 3000);
              return;
            }
            await archiveHabit(h.id);
            router.push("/");
          }}
        >
          {confirm ? "Toca otra vez para eliminar" : "Eliminar"}
        </button>
      </div>
    </div>
  );
}
