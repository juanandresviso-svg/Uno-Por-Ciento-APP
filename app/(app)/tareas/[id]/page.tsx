"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useHabits } from "@/components/HabitsProvider";
import { IconBack, IconCheck } from "@/components/Icons";
import { useTasks } from "@/components/TasksProvider";
import { dueLabel, PRIORITY_LABEL } from "@/lib/tasks";

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { today } = useHabits();
  const { ready, tasks, projects, subtasks, toggleDone, deleteTask, addSubtask, toggleSubtask, deleteSubtask, openTaskForm } = useTasks();
  const [newSub, setNewSub] = useState("");
  const [confirm, setConfirm] = useState(false);
  const t = tasks.find((x) => x.id === id);

  if (!ready) return <div className="skeleton" style={{ marginTop: 40, height: 200 }} />;
  if (!t)
    return (
      <div className="empty">
        <p>Esta tarea ya no existe.</p>
        <Link className="back" href="/tareas">Volver a Tareas</Link>
      </div>
    );

  const project = projects.find((p) => p.id === t.project_id);
  const subs = subtasks[t.id] ?? [];
  const due = dueLabel(t, today);
  const overdue = !t.done_at && !!t.due_date && t.due_date < today;

  return (
    <>
      <button className="back" onClick={() => router.back()}><IconBack />Volver</button>
      <h1 className="title" style={{ fontSize: 28, marginTop: 6, textDecoration: t.done_at ? "line-through" : undefined }}>{t.title}</h1>
      <div className="chips">
        <span className="chip on" style={{ ["--hc" as string]: `var(--prio-${t.priority})` }}>Prioridad {PRIORITY_LABEL[t.priority].toLowerCase()}</span>
        {due && <span className="chip" style={overdue ? { color: "var(--warn)" } : undefined}>{due}</span>}
        {t.remind && !t.done_at && <span className="chip">Con aviso</span>}
        {project && <span className="chip on" style={{ ["--hc" as string]: `var(--h-${project.color})` }}>{project.name}</span>}
        {t.done_at && <span className="chip">Hecha</span>}
      </div>

      {t.notes && (
        <>
          <div className="section-label"><span>Notas</span></div>
          <div className="card notes">{t.notes}</div>
        </>
      )}

      <div className="section-label">
        <span>Subtareas</span>
        {subs.length > 0 && <span className="num">{subs.filter((s) => s.done).length}/{subs.length}</span>}
      </div>
      <div className="card flush">
        <div className="subs">
          {subs.map((s) => (
            <div key={s.id} className={`sub${s.done ? " done" : ""}`}>
              <button className={`tcheck${s.done ? " on" : ""}`} aria-pressed={s.done} aria-label={`Marcar ${s.title}`} onClick={() => toggleSubtask(s)}>
                {s.done && <IconCheck />}
              </button>
              <span>{s.title}</span>
              <button className="x" aria-label={`Quitar ${s.title}`} onClick={() => deleteSubtask(s)}>×</button>
            </div>
          ))}
          <form
            className="quick"
            style={{ margin: 0, padding: "10px 0" }}
            onSubmit={async (e) => {
              e.preventDefault();
              const v = newSub.trim();
              if (!v) return;
              setNewSub("");
              await addSubtask(t.id, v);
            }}
          >
            <input id="new-sub" value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Agregar paso…" autoComplete="off" enterKeyHint="done" />
            <button disabled={!newSub.trim()}>+</button>
          </form>
        </div>
      </div>

      <div className="row-actions">
        <button className="btn primary" onClick={() => toggleDone(t)}>{t.done_at ? "Reabrir" : "Marcar hecha"}</button>
        <button className="btn" onClick={() => openTaskForm(t)}>Editar</button>
      </div>
      <button
        className="btn danger"
        style={{ width: "100%", marginTop: 8 }}
        onClick={async () => {
          if (!confirm) {
            setConfirm(true);
            setTimeout(() => setConfirm(false), 3000);
            return;
          }
          await deleteTask(t.id);
          router.push("/tareas");
        }}
      >
        {confirm ? "Toca otra vez para eliminar" : "Eliminar tarea"}
      </button>
    </>
  );
}
