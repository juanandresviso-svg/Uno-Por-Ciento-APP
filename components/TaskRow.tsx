"use client";

import Link from "next/link";
import { useState } from "react";
import { dueLabel } from "@/lib/tasks";
import type { Task } from "@/lib/types";
import { IconCheck } from "./Icons";
import { useHabits } from "./HabitsProvider";
import { useTasks } from "./TasksProvider";

export default function TaskRow({ t, hideProject = false }: { t: Task; hideProject?: boolean }) {
  const { today } = useHabits();
  const { toggleDone, projects, subtasks } = useTasks();
  const [pop, setPop] = useState(0);
  const project = projects.find((p) => p.id === t.project_id);
  const subs = subtasks[t.id] ?? [];
  const subsDone = subs.filter((s) => s.done).length;
  const overdue = !t.done_at && !!t.due_date && t.due_date < today;
  const due = dueLabel(t, today);

  return (
    <div className={`task${t.done_at ? " is-done" : ""}`}>
      <button
        key={pop}
        className={`tcheck${t.done_at ? " on" : ""}${pop ? " pop" : ""}`}
        style={{ ["--pc" as string]: `var(--prio-${t.priority})` }}
        aria-pressed={!!t.done_at}
        aria-label={`${t.done_at ? "Reabrir" : "Completar"} ${t.title}`}
        onClick={() => {
          toggleDone(t);
          setPop((p) => p + 1);
        }}
      >
        {t.done_at && <IconCheck />}
      </button>
      <Link href={`/tareas/${t.id}`} className="tmeta">
        <strong>{t.title}</strong>
        <span className="tline">
          {due && <span className={overdue ? "due overdue" : "due"}>{due}{t.remind && !t.done_at ? " · con aviso" : ""}</span>}
          {!hideProject && project && (
            <span className="proj" style={{ ["--hc" as string]: `var(--h-${project.color})` }}><i />{project.name}</span>
          )}
          {subs.length > 0 && <span className="num">{subsDone}/{subs.length}</span>}
          {t.notes && <span aria-label="Tiene notas">¶</span>}
        </span>
      </Link>
    </div>
  );
}
