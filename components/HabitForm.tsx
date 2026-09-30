"use client";

import { useEffect, useRef, useState } from "react";
import { DOW, DOW_ORDER } from "@/lib/dates";
import type { DayPart, Habit, HabitColor } from "@/lib/types";
import { useHabits, type HabitDraft } from "./HabitsProvider";

const COLORS: HabitColor[] = ["mar", "sol", "coral", "lila", "cielo"];
const PARTS: [DayPart, string][] = [
  ["mañana", "Mañana"],
  ["tarde", "Tarde"],
  ["noche", "Noche"],
];

export default function HabitForm({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const { saveHabit, habits } = useHabits();
  const [d, setD] = useState<HabitDraft>(() =>
    habit
      ? { ...habit }
      : {
          name: "",
          cue: "",
          type: "check",
          target: 8,
          unit: "",
          days: [0, 1, 2, 3, 4, 5, 6],
          part: "mañana",
          remind_time: "07:00",
          remind: true,
          color: COLORS[habits.length % COLORS.length],
        }
  );
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!habit) setTimeout(() => nameRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [habit, onClose]);

  const set = <K extends keyof HabitDraft>(k: K, v: HabitDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggleDay = (i: number) => set("days", d.days.includes(i) ? d.days.filter((x) => x !== i) : [...d.days, i].sort());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = d.name.trim();
    if (!name) return setErr("Ponle nombre al hábito.");
    if (!d.days.length) return setErr("Elige al menos un día.");
    if (d.type === "count" && (!d.target || d.target < 2)) return setErr("La meta diaria debe ser 2 o más.");
    setSaving(true);
    const error = await saveHabit({ ...d, name, cue: d.cue.trim(), unit: d.unit.trim() });
    setSaving(false);
    if (error) return setErr("No se pudo guardar: " + error);
    onClose();
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" onSubmit={submit} noValidate aria-label={habit ? "Editar hábito" : "Nuevo hábito"}>
        <div className="grab" />
        <h2>{habit ? "Editar hábito" : "Nuevo hábito"}</h2>

        <div className="field">
          <label htmlFor="f-name">Hábito</label>
          <input ref={nameRef} id="f-name" type="text" value={d.name} maxLength={60} placeholder="Ej. Leer 10 páginas" autoComplete="off" onChange={(e) => set("name", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="f-cue">Señal: ¿después de qué lo haces?</label>
          <input id="f-cue" type="text" value={d.cue} maxLength={80} placeholder="Ej. Después de servirme el café" autoComplete="off" onChange={(e) => set("cue", e.target.value)} />
          <span className="help">Amarrarlo a algo que ya haces lo vuelve obvio.</span>
        </div>

        <div className="field">
          <span className="lab">Cómo se mide</span>
          <div className="seg">
            <button type="button" aria-pressed={d.type === "check"} onClick={() => set("type", "check")}>Sí / No</button>
            <button type="button" aria-pressed={d.type === "count"} onClick={() => set("type", "count")}>Cantidad</button>
          </div>
        </div>

        {d.type === "count" && (
          <div className="two field">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="f-target">Meta diaria</label>
              <input id="f-target" type="number" inputMode="numeric" min={2} max={99} value={d.target || ""} onChange={(e) => set("target", Math.min(99, parseInt(e.target.value, 10) || 0))} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="f-unit">Unidad</label>
              <input id="f-unit" type="text" value={d.unit} maxLength={16} placeholder="vasos, páginas…" onChange={(e) => set("unit", e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <span className="lab">Días</span>
          <div className="daysel">
            {DOW_ORDER.map((i) => (
              <button type="button" key={i} aria-pressed={d.days.includes(i)} onClick={() => toggleDay(i)}>
                {DOW[i]}
              </button>
            ))}
          </div>
        </div>

        <div className="two field">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="f-part">Momento</label>
            <select id="f-part" value={d.part} onChange={(e) => set("part", e.target.value as DayPart)}>
              {PARTS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="f-time">Hora</label>
            <input id="f-time" type="time" value={d.remind_time ?? ""} onChange={(e) => set("remind_time", e.target.value || null)} />
          </div>
        </div>

        <div className="field">
          <div className="set" style={{ border: 0, padding: 0 }}>
            <b>Recordarme a esa hora</b>
            <small>Notificación en el teléfono</small>
            <button type="button" className="switch ctl" role="switch" aria-checked={d.remind} aria-label="Recordarme" onClick={() => set("remind", !d.remind)} />
          </div>
        </div>

        <div className="field">
          <span className="lab">Color</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button type="button" key={c} aria-pressed={d.color === c} aria-label={`Color ${c}`} style={{ ["--hc" as string]: `var(--h-${c})` }} onClick={() => set("color", c)} />
            ))}
          </div>
        </div>

        <div className="err" role="alert">{err}</div>
        <div className="row-actions" style={{ marginTop: 4 }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Guardando…" : habit ? "Guardar cambios" : "Crear hábito"}
          </button>
        </div>
      </form>
    </div>
  );
}
