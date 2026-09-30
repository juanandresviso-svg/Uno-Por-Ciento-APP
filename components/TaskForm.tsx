"use client";

import { useEffect, useRef, useState } from "react";
import { addDays } from "@/lib/dates";
import type { Priority, Task } from "@/lib/types";
import { useHabits } from "./HabitsProvider";
import { useTasks, type TaskDraft } from "./TasksProvider";

type When = "none" | "today" | "tomorrow" | "date" | "someday";

export default function TaskForm({ task, defaults, onClose }: { task: Task | null; defaults?: Partial<TaskDraft>; onClose: () => void }) {
  const { today } = useHabits();
  const { saveTask, projects, openProjectForm } = useTasks();
  const [d, setD] = useState<TaskDraft>(() =>
    task
      ? { ...task }
      : {
          title: "",
          notes: "",
          project_id: null,
          priority: 2,
          due_date: null,
          due_time: null,
          remind: false,
          someday: false,
          ...defaults,
        }
  );
  const initialWhen = (): When => {
    if (d.someday) return "someday";
    if (!d.due_date) return "none";
    if (d.due_date === today) return "today";
    if (d.due_date === addDays(today, 1)) return "tomorrow";
    return "date";
  };
  const [when, setWhen] = useState<When>(initialWhen);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task) setTimeout(() => titleRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, onClose]);

  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  function pickWhen(w: When) {
    setWhen(w);
    setD((x) => ({
      ...x,
      someday: w === "someday",
      due_date: w === "today" ? today : w === "tomorrow" ? addDays(today, 1) : w === "date" ? x.due_date ?? addDays(today, 2) : null,
      due_time: w === "none" || w === "someday" ? null : x.due_time,
      remind: w === "none" || w === "someday" ? false : x.remind,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const title = d.title.trim();
    if (!title) return setErr("Escribe qué hay que hacer.");
    if (when === "date" && !d.due_date) return setErr("Elige la fecha.");
    if (d.remind && !d.due_time) return setErr("Para recordarte necesito una hora.");
    setSaving(true);
    const error = await saveTask({ ...d, title, notes: d.notes.trim() });
    setSaving(false);
    if (error) return setErr("No se pudo guardar: " + error);
    onClose();
  }

  const hasDate = when === "today" || when === "tomorrow" || when === "date";
  const WHEN: [When, string][] = [
    ["none", "Sin fecha"],
    ["today", "Hoy"],
    ["tomorrow", "Mañana"],
    ["date", "Otra fecha"],
    ["someday", "Algún día"],
  ];

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" onSubmit={submit} noValidate aria-label={task ? "Editar tarea" : "Nueva tarea"}>
        <div className="grab" />
        <h2>{task ? "Editar tarea" : "Nueva tarea"}</h2>

        <div className="field">
          <label htmlFor="t-title">Tarea</label>
          <input ref={titleRef} id="t-title" type="text" value={d.title} maxLength={200} placeholder="Ej. Mandar cotización a Coca-Cola" autoComplete="off" onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="t-project">Proyecto</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select id="t-project" value={d.project_id ?? ""} onChange={(e) => set("project_id", e.target.value || null)}>
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button type="button" className="iconbtn" style={{ flex: "none", height: 46, width: 46 }} aria-label="Nuevo proyecto" onClick={() => openProjectForm(null)}>+</button>
          </div>
        </div>

        <div className="field">
          <span className="lab">Prioridad</span>
          <div className="seg seg3">
            {([1, 2, 3] as Priority[]).map((p) => (
              <button key={p} type="button" aria-pressed={d.priority === p} onClick={() => set("priority", p)}>
                <i className="prio-dot" style={{ background: `var(--prio-${p})` }} />
                {p === 1 ? "Alta" : p === 2 ? "Media" : "Baja"}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="lab">Cuándo</span>
          <div className="whenrow">
            {WHEN.map(([w, l]) => (
              <button key={w} type="button" className="chipbtn" aria-pressed={when === w} onClick={() => pickWhen(w)}>{l}</button>
            ))}
          </div>
        </div>

        {hasDate && (
          <div className="two field">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="t-date">Fecha</label>
              <input id="t-date" type="date" value={d.due_date ?? ""} disabled={when !== "date"} onChange={(e) => set("due_date", e.target.value || null)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="t-time">Hora (opcional)</label>
              <input id="t-time" type="time" value={d.due_time ?? ""} onChange={(e) => setD((x) => ({ ...x, due_time: e.target.value || null, remind: e.target.value ? x.remind || true : false }))} />
            </div>
          </div>
        )}

        {hasDate && (
          <div className="field">
            <div className="set" style={{ border: 0, padding: 0 }}>
              <b>Recordarme a esa hora</b>
              <small>{d.due_time ? "Notificación en el teléfono" : "Ponle una hora para activarlo"}</small>
              <button type="button" className="switch ctl" role="switch" aria-checked={d.remind} aria-label="Recordarme" disabled={!d.due_time} onClick={() => set("remind", !d.remind)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="t-notes">Notas</label>
          <textarea id="t-notes" rows={3} value={d.notes} maxLength={2000} placeholder="Detalles, links, contexto…" onChange={(e) => set("notes", e.target.value)} />
        </div>

        {!task && <p className="hint" style={{ marginTop: -6, marginBottom: 12 }}>Las subtareas se agregan desde el detalle de la tarea.</p>}

        <div className="err" role="alert">{err}</div>
        <div className="row-actions" style={{ marginTop: 4 }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? "Guardando…" : task ? "Guardar" : "Crear tarea"}</button>
        </div>
      </form>
    </div>
  );
}
