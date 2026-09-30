"use client";

import { useEffect, useMemo, useState } from "react";
import { useHabits } from "@/components/HabitsProvider";
import TaskRow from "@/components/TaskRow";
import { useTasks, type TaskDraft } from "@/components/TasksProvider";
import { addDays, longDate } from "@/lib/dates";
import { bucketOf, compareTasks, dayHeading, type Bucket } from "@/lib/tasks";
import type { Task } from "@/lib/types";

type View = "hoy" | "proximas" | "bandeja" | "algun-dia" | "hechas";
const VIEWS: [View, string][] = [
  ["hoy", "Hoy"],
  ["proximas", "Próximas"],
  ["bandeja", "Bandeja"],
  ["algun-dia", "Algún día"],
  ["hechas", "Hechas"],
];
const STORE = "upc-tareas-vista";

export default function TasksPage() {
  const { today } = useHabits();
  const { ready, tasks, projects, quickAdd, openProjectForm } = useTasks();
  const [view, setView] = useState<View>("hoy");
  const [project, setProject] = useState<string | "all" | "none">("all");
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (s?.view) setView(s.view);
      if (s?.project) setProject(s.project);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ view, project }));
    } catch {}
  }, [view, project]);

  const inProject = (t: Task) => project === "all" || (project === "none" ? !t.project_id : t.project_id === project);
  const scoped = useMemo(() => tasks.filter(inProject), [tasks, project]); // eslint-disable-line react-hooks/exhaustive-deps

  const by = (b: Bucket) => scoped.filter((t) => bucketOf(t, today) === b).sort(compareTasks);
  const overdue = by("vencidas");
  const counts: Record<View, number> = {
    hoy: overdue.length + by("hoy").length,
    proximas: by("proximas").length,
    bandeja: by("bandeja").length,
    "algun-dia": by("algun-dia").length,
    hechas: by("hechas").length,
  };

  const defaults = (): Partial<TaskDraft> => ({
    project_id: project !== "all" && project !== "none" ? project : null,
    due_date: view === "hoy" ? today : view === "proximas" ? addDays(today, 1) : null,
    someday: view === "algun-dia",
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = text.trim();
    if (!title) return;
    setAdding(true);
    await quickAdd(title, defaults());
    setText("");
    setAdding(false);
  }

  const list = (items: Task[]) => (
    <div className="list">{items.map((t) => <TaskRow key={t.id} t={t} hideProject={project !== "all"} />)}</div>
  );

  let body: React.ReactNode;
  if (!ready) {
    body = <div className="list"><div className="skeleton" /><div className="skeleton" /></div>;
  } else if (view === "hoy") {
    const hoy = by("hoy");
    body = !overdue.length && !hoy.length ? (
      <div className="empty">Nada pendiente para hoy.</div>
    ) : (
      <>
        {overdue.length > 0 && (<><div className="group-label warn"><span>Vencidas</span><span className="num">{overdue.length}</span></div>{list(overdue)}</>)}
        {hoy.length > 0 && (<><div className="group-label"><span>{longDate(today)}</span><span className="num">{hoy.length}</span></div>{list(hoy)}</>)}
      </>
    );
  } else if (view === "proximas") {
    const items = by("proximas");
    const days = [...new Set(items.map((t) => t.due_date!))];
    body = !items.length ? <div className="empty">No hay tareas con fecha en los próximos días.</div> : days.map((d) => {
      const g = items.filter((t) => t.due_date === d);
      return (
        <section key={d}>
          <div className="group-label"><span>{dayHeading(d, today)}</span><span className="num">{g.length}</span></div>
          {list(g)}
        </section>
      );
    });
  } else if (view === "hechas") {
    const items = by("hechas").sort((a, b) => (b.done_at! > a.done_at! ? 1 : -1));
    body = !items.length ? <div className="empty">Aquí aparecen las tareas que completes en los últimos 14 días.</div> : <><div className="group-label"><span>Últimos 14 días</span><span className="num">{items.length}</span></div>{list(items)}</>;
  } else {
    const items = by(view);
    body = !items.length ? (
      <div className="empty">{view === "bandeja" ? "La bandeja está vacía. Anota aquí lo que se te ocurra y luego le pones fecha." : "Ideas y pendientes sin apuro van aquí."}</div>
    ) : (
      <div style={{ marginTop: 14 }}>{list(items)}</div>
    );
  }

  return (
    <>
      <div className="top">
        <div>
          <p className="eyebrow">{counts.hoy} para hoy{overdue.length ? ` · ${overdue.length} vencidas` : ""}</p>
          <h1 className="title">Tareas</h1>
        </div>
      </div>

      <div className="views" role="group" aria-label="Vista">
        {VIEWS.map(([v, l]) => (
          <button key={v} aria-pressed={view === v} className={v === "hoy" && overdue.length ? "alert-n" : ""} onClick={() => setView(v)}>
            {l}
            {v !== "hechas" && counts[v] > 0 && <span className="n">{counts[v]}</span>}
          </button>
        ))}
      </div>

      <div className="projbar" role="group" aria-label="Proyecto">
        <button aria-pressed={project === "all"} onClick={() => setProject("all")}>Todos</button>
        {projects.map((p) => (
          <button
            key={p.id}
            aria-pressed={project === p.id}
            style={{ ["--hc" as string]: `var(--h-${p.color})` }}
            onClick={() => (project === p.id ? openProjectForm(p) : setProject(p.id))}
            title={project === p.id ? "Toca otra vez para editar" : undefined}
          >
            <i />{p.name}
          </button>
        ))}
        <button aria-pressed={project === "none"} onClick={() => setProject("none")}>Sin proyecto</button>
        <button onClick={() => openProjectForm(null)} aria-label="Nuevo proyecto">+ Proyecto</button>
      </div>

      {view !== "hechas" && (
        <form className="quick" onSubmit={add}>
          <input
            id="quick-task"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={view === "hoy" ? "Agregar para hoy…" : view === "proximas" ? "Agregar para mañana…" : view === "algun-dia" ? "Agregar a algún día…" : "Anotar en la bandeja…"}
            autoComplete="off"
            enterKeyHint="done"
          />
          <button disabled={!text.trim() || adding}>Agregar</button>
        </form>
      )}

      {body}
      {project !== "all" && project !== "none" && <p className="hint" style={{ textAlign: "center", marginTop: 18 }}>Toca el proyecto seleccionado otra vez para editarlo.</p>}
    </>
  );
}
