"use client";

import { useState } from "react";
import type { HabitColor, Project } from "@/lib/types";
import { useTasks } from "./TasksProvider";

const COLORS: HabitColor[] = ["mar", "sol", "coral", "lila", "cielo"];

export default function ProjectForm({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { saveProject, archiveProject, tasks } = useTasks();
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState<HabitColor>(project?.color ?? "mar");
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const open = project ? tasks.filter((t) => t.project_id === project.id && !t.done_at).length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Ponle nombre al proyecto.");
    const error = await saveProject({ id: project?.id, name: name.trim(), color });
    if (error) return setErr("No se pudo guardar: " + error);
    onClose();
  }

  return (
    <div className="scrim" style={{ zIndex: 45 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" onSubmit={submit} noValidate aria-label={project ? "Editar proyecto" : "Nuevo proyecto"}>
        <div className="grab" />
        <h2>{project ? "Editar proyecto" : "Nuevo proyecto"}</h2>
        <div className="field">
          <label htmlFor="p-name">Nombre</label>
          <input id="p-name" type="text" value={name} maxLength={40} placeholder="Ej. Hawaiira Studio" autoComplete="off" autoFocus={!project} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <span className="lab">Color</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button type="button" key={c} aria-pressed={color === c} aria-label={`Color ${c}`} style={{ ["--hc" as string]: `var(--h-${c})` }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="err" role="alert">{err}</div>
        <div className="row-actions" style={{ marginTop: 4 }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary">{project ? "Guardar" : "Crear proyecto"}</button>
        </div>
        {project && (
          <button
            type="button"
            className="btn danger"
            style={{ width: "100%", marginTop: 10 }}
            onClick={async () => {
              if (!confirm) {
                setConfirm(true);
                setTimeout(() => setConfirm(false), 3000);
                return;
              }
              await archiveProject(project.id);
              onClose();
            }}
          >
            {confirm ? `Toca otra vez${open ? ` (${open} tareas quedan sin proyecto)` : ""}` : "Eliminar proyecto"}
          </button>
        )}
      </form>
    </div>
  );
}
