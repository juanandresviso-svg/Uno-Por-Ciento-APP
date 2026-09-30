"use client";

import Link from "next/link";
import { useState } from "react";
import { addDays, fmtTime } from "@/lib/dates";
import { cellState, isDone, isScheduled, streak, val } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { IconCheck, IconFlame } from "./Icons";
import { useHabits } from "./HabitsProvider";

export const hc = (h: Habit) => ({ ["--hc" as string]: `var(--h-${h.color})` }) as React.CSSProperties;

export function CheckButton({ h }: { h: Habit }) {
  const { logs, today, tap } = useHabits();
  const [pop, setPop] = useState(0);
  const v = val(logs, h, today);
  const done = v >= h.target;
  const onClick = () => {
    tap(h);
    setPop((p) => p + 1);
  };
  if (h.type === "count") {
    const C = 2 * Math.PI * 21;
    const p = Math.min(1, v / h.target);
    return (
      <button key={pop} className={`check count${done ? " on" : ""}${pop ? " pop" : ""}`} onClick={onClick} aria-label={`Sumar a ${h.name}: ${v} de ${h.target}`}>
        {done ? (
          <IconCheck />
        ) : (
          <>
            <svg className="prog" viewBox="0 0 46 46" aria-hidden="true">
              <circle cx="23" cy="23" r="21" fill="none" stroke="var(--hc)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} />
            </svg>
            <span className="cnt">{v}/{h.target}</span>
          </>
        )}
      </button>
    );
  }
  return (
    <button key={pop} className={`check${done ? " on" : ""}${pop ? " pop" : ""}`} onClick={onClick} aria-pressed={done} aria-label={`Marcar ${h.name}`}>
      {done && <IconCheck />}
    </button>
  );
}

export function StreakBadge({ n }: { n: number }) {
  return (
    <div className={`streak${n ? "" : " zero"}`}>
      <IconFlame />
      <span className="n">{n}</span>
      <small>{n === 1 ? "día" : "días"}</small>
    </div>
  );
}

export default function HabitRow({ h }: { h: Habit }) {
  const { logs, today } = useHabits();
  const scheduled = isScheduled(h, today);
  const days = [6, 5, 4, 3, 2, 1, 0].map((i) => cellState(logs, h, addDays(today, -i), today));
  return (
    <div className={`habit${isDone(logs, h, today) ? " done" : ""}${scheduled ? "" : " rest"}`} style={hc(h)}>
      {scheduled ? <CheckButton h={h} /> : <span className="check ghost" aria-hidden="true" />}
      <Link className="meta" href={`/habito/${h.id}`}>
        <strong>{h.name}</strong>
        <span className="cue">
          {h.cue || "Sin señal definida"}
          {h.remind_time ? ` · ${fmtTime(h.remind_time)}` : ""}
        </span>
        <span className="dots" aria-hidden="true">
          {days.map((c, i) => (
            <i key={i} className={c === "n" || c === "f" ? "x" : c} />
          ))}
        </span>
      </Link>
      <StreakBadge n={streak(logs, h, today)} />
    </div>
  );
}
