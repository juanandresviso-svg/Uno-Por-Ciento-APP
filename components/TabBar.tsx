"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBars, IconList, IconPlus, IconToday, IconWallet } from "./Icons";
import { useHabits } from "./HabitsProvider";

export default function TabBar() {
  const path = usePathname();
  const { openForm, toast } = useHabits();
  const cur = (p: string) => (p === "/" ? path === "/" || path.startsWith("/habito") : path.startsWith(p)) ? "page" : undefined;
  return (
    <nav className="tabs" aria-label="Navegación">
      <div className="tabs-inner">
        <Link className="tab" href="/" aria-current={cur("/")}>
          <IconToday />Hoy
        </Link>
        <Link className="tab" href="/progreso" aria-current={cur("/progreso")}>
          <IconBars />Progreso
        </Link>
        <button className="fab" onClick={() => openForm()} aria-label="Nuevo hábito">
          <IconPlus />
        </button>
        <button className="tab soon" onClick={() => toast("Tareas llega en la fase 2")}>
          <IconList />Tareas
        </button>
        <button className="tab soon" onClick={() => toast("Finanzas llega en la fase 3")}>
          <IconWallet />Finanzas
        </button>
      </div>
    </nav>
  );
}
