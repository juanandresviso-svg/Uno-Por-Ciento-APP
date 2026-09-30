"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconBars, IconList, IconPlus, IconToday, IconWallet } from "./Icons";
import { useHabits } from "./HabitsProvider";
import { useTasks } from "./TasksProvider";

export default function TabBar() {
  const path = usePathname();
  const { openForm, toast, today } = useHabits();
  const { openTaskForm } = useTasks();
  const [chooser, setChooser] = useState(false);
  const cur = (p: string) =>
    (p === "/" ? path === "/" || path.startsWith("/habito") : path.startsWith(p)) ? "page" : undefined;

  function plus() {
    if (path.startsWith("/tareas")) return openTaskForm(null);
    setChooser(true);
  }

  return (
    <>
      <nav className="tabs" aria-label="Navegación">
        <div className="tabs-inner">
          <Link className="tab" href="/" aria-current={cur("/")}>
            <IconToday />Hoy
          </Link>
          <Link className="tab" href="/tareas" aria-current={cur("/tareas")}>
            <IconList />Tareas
          </Link>
          <button className="fab" onClick={plus} aria-label="Crear">
            <IconPlus />
          </button>
          <Link className="tab" href="/progreso" aria-current={cur("/progreso")}>
            <IconBars />Progreso
          </Link>
          <button className="tab soon" onClick={() => toast("Finanzas llega en la fase 3")}>
            <IconWallet />Finanzas
          </button>
        </div>
      </nav>
      {chooser && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && setChooser(false)}>
          <div className="sheet" role="dialog" aria-label="Crear">
            <div className="grab" />
            <h2>Crear</h2>
            <div className="chooser">
              <button onClick={() => { setChooser(false); openTaskForm(null, { due_date: today }); }}>
                <b>Tarea para hoy</b><span>Algo que tienes que hacer hoy</span>
              </button>
              <button onClick={() => { setChooser(false); openTaskForm(null); }}>
                <b>Tarea</b><span>Con o sin fecha, a la bandeja o a un proyecto</span>
              </button>
              <button onClick={() => { setChooser(false); openForm(); }}>
                <b>Hábito</b><span>Algo que quieres repetir todos los días o ciertos días</span>
              </button>
            </div>
            <div className="row-actions"><button className="btn" onClick={() => setChooser(false)}>Cancelar</button></div>
          </div>
        </div>
      )}
    </>
  );
}
