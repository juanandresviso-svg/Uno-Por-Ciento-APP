"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HabitColor, Project, Subtask, Task } from "@/lib/types";
import { useHabits } from "./HabitsProvider";
import TaskForm from "./TaskForm";
import ProjectForm from "./ProjectForm";

export type TaskDraft = Omit<Task, "id" | "done_at" | "position" | "created_at"> & { id?: string };

interface Ctx {
  ready: boolean;
  projects: Project[];
  tasks: Task[];
  subtasks: Record<string, Subtask[]>;
  saveTask: (d: TaskDraft) => Promise<string | null>;
  quickAdd: (title: string, defaults?: Partial<TaskDraft>) => Promise<void>;
  toggleDone: (t: Task) => void;
  deleteTask: (id: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (s: Subtask) => void;
  deleteSubtask: (s: Subtask) => void;
  saveProject: (p: { id?: string; name: string; color: HabitColor }) => Promise<string | null>;
  archiveProject: (id: string) => Promise<void>;
  openTaskForm: (t?: Task | null, defaults?: Partial<TaskDraft>) => void;
  openProjectForm: (p?: Project | null) => void;
  reloadTasks: () => Promise<void>;
}

const TasksContext = createContext<Ctx | null>(null);
export const useTasks = () => {
  const c = useContext(TasksContext);
  if (!c) throw new Error("useTasks fuera de TasksProvider");
  return c;
};

const DEFAULT_PROJECTS: { name: string; color: HabitColor }[] = [
  { name: "Personal", color: "mar" },
  { name: "Hawaiira", color: "cielo" },
  { name: "OnlyDrone", color: "lila" },
  { name: "Appbogados", color: "sol" },
];

export default function TasksProvider({ children }: { children: React.ReactNode }) {
  const { ready: habitsReady, settings, updateSettings, toast } = useHabits();
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  const sb = useCallback(() => (sbRef.current ??= createClient()), []);

  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [form, setForm] = useState<{ task: Task | null; defaults?: Partial<TaskDraft> } | undefined>(undefined);
  const [projectForm, setProjectForm] = useState<Project | null | undefined>(undefined);
  const seeding = useRef(false);

  const reloadTasks = useCallback(async () => {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const [p, t] = await Promise.all([
      sb().from("projects").select("*").is("archived_at", null).order("position").order("created_at"),
      sb().from("tasks").select("*").or(`done_at.is.null,done_at.gte.${since}`).order("created_at"),
    ]);
    if (p.error || t.error) {
      toast(/relation|does not exist|schema cache/i.test((p.error || t.error)!.message) ? "Falta correr 0002_tareas.sql en Supabase" : "No se pudieron cargar las tareas");
      setReady(true);
      return;
    }
    const list = (t.data as Task[]).map((x) => ({ ...x, due_time: x.due_time?.slice(0, 5) ?? null }));
    setProjects(p.data as Project[]);
    setTasks(list);
    const ids = list.map((x) => x.id);
    const subs: Record<string, Subtask[]> = {};
    for (let i = 0; i < ids.length; i += 150) {
      const { data } = await sb().from("subtasks").select("*").in("task_id", ids.slice(i, i + 150)).order("position").order("created_at");
      for (const s of (data ?? []) as Subtask[]) (subs[s.task_id] ??= []).push(s);
    }
    setSubtasks(subs);
    setReady(true);
  }, [sb, toast]);

  useEffect(() => {
    reloadTasks();
    const onVis = () => document.visibilityState === "visible" && reloadTasks();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reloadTasks]);

  // Primera vez: crea las áreas iniciales (se pueden editar o borrar).
  useEffect(() => {
    if (!habitsReady || !ready || settings.projects_seeded || projects.length || seeding.current) return;
    seeding.current = true;
    (async () => {
      const { data } = await sb()
        .from("projects")
        .insert(DEFAULT_PROJECTS.map((p, i) => ({ ...p, position: i })))
        .select();
      if (data) setProjects(data as Project[]);
      await updateSettings({ projects_seeded: true });
    })();
  }, [habitsReady, ready, settings.projects_seeded, projects.length, sb, updateSettings]);

  const payloadOf = (d: TaskDraft) => ({
    title: d.title,
    notes: d.notes,
    project_id: d.project_id || null,
    priority: d.priority,
    due_date: d.someday ? null : d.due_date || null,
    due_time: d.someday || !d.due_date ? null : d.due_time || null,
    remind: !!(d.remind && d.due_date && d.due_time && !d.someday),
    someday: d.someday,
  });

  const saveTask = useCallback(
    async (d: TaskDraft) => {
      const payload = payloadOf(d);
      if (d.id) {
        const { data, error } = await sb().from("tasks").update(payload).eq("id", d.id).select().single();
        if (error) return error.message;
        setTasks((ts) => ts.map((t) => (t.id === d.id ? { ...(data as Task), due_time: payload.due_time } : t)));
        toast("Tarea guardada");
      } else {
        const { data, error } = await sb().from("tasks").insert(payload).select().single();
        if (error) return error.message;
        setTasks((ts) => [...ts, { ...(data as Task), due_time: payload.due_time }]);
        toast("Tarea creada");
      }
      return null;
    },
    [sb, toast]
  );

  const quickAdd = useCallback(
    async (title: string, defaults?: Partial<TaskDraft>) => {
      const err = await saveTask({
        title,
        notes: "",
        project_id: null,
        priority: 2,
        due_date: null,
        due_time: null,
        remind: false,
        someday: false,
        ...defaults,
      });
      if (err) toast("No se pudo crear: " + err);
    },
    [saveTask, toast]
  );

  const toggleDone = useCallback(
    (t: Task) => {
      const done_at = t.done_at ? null : new Date().toISOString();
      setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done_at } : x)));
      if (done_at) toast(`Hecha · ${t.title}`);
      sb()
        .from("tasks")
        .update({ done_at })
        .eq("id", t.id)
        .then(({ error }) => {
          if (error) {
            setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done_at: t.done_at } : x)));
            toast("No se pudo guardar. Revisa tu conexión.");
          }
        });
    },
    [sb, toast]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const { error } = await sb().from("tasks").delete().eq("id", id);
      if (error) return toast("No se pudo eliminar");
      setTasks((ts) => ts.filter((t) => t.id !== id));
      toast("Tarea eliminada");
    },
    [sb, toast]
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      const position = (subtasks[taskId]?.length ?? 0) + 1;
      const { data, error } = await sb().from("subtasks").insert({ task_id: taskId, title, position }).select().single();
      if (error) return toast("No se pudo agregar");
      setSubtasks((m) => ({ ...m, [taskId]: [...(m[taskId] ?? []), data as Subtask] }));
    },
    [sb, subtasks, toast]
  );

  const toggleSubtask = useCallback(
    (s: Subtask) => {
      setSubtasks((m) => ({ ...m, [s.task_id]: (m[s.task_id] ?? []).map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) }));
      sb().from("subtasks").update({ done: !s.done }).eq("id", s.id).then(({ error }) => error && toast("No se pudo guardar"));
    },
    [sb, toast]
  );

  const deleteSubtask = useCallback(
    (s: Subtask) => {
      setSubtasks((m) => ({ ...m, [s.task_id]: (m[s.task_id] ?? []).filter((x) => x.id !== s.id) }));
      sb().from("subtasks").delete().eq("id", s.id).then(({ error }) => error && toast("No se pudo eliminar"));
    },
    [sb, toast]
  );

  const saveProject = useCallback(
    async (p: { id?: string; name: string; color: HabitColor }) => {
      if (p.id) {
        const { error } = await sb().from("projects").update({ name: p.name, color: p.color }).eq("id", p.id);
        if (error) return error.message;
        setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: p.name, color: p.color } : x)));
      } else {
        const position = projects.length ? Math.max(...projects.map((x) => x.position)) + 1 : 0;
        const { data, error } = await sb().from("projects").insert({ name: p.name, color: p.color, position }).select().single();
        if (error) return error.message;
        setProjects((ps) => [...ps, data as Project]);
      }
      toast("Proyecto guardado");
      return null;
    },
    [sb, projects, toast]
  );

  const archiveProject = useCallback(
    async (id: string) => {
      const { error } = await sb().from("projects").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (error) return toast("No se pudo eliminar");
      await sb().from("tasks").update({ project_id: null }).eq("project_id", id);
      setProjects((ps) => ps.filter((p) => p.id !== id));
      setTasks((ts) => ts.map((t) => (t.project_id === id ? { ...t, project_id: null } : t)));
      toast("Proyecto eliminado. Sus tareas quedaron sin proyecto.");
    },
    [sb, toast]
  );

  const value: Ctx = {
    ready,
    projects,
    tasks,
    subtasks,
    saveTask,
    quickAdd,
    toggleDone,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    saveProject,
    archiveProject,
    openTaskForm: (task, defaults) => setForm({ task: task ?? null, defaults }),
    openProjectForm: (p) => setProjectForm(p ?? null),
    reloadTasks,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
      {form && <TaskForm task={form.task} defaults={form.defaults} onClose={() => setForm(undefined)} />}
      {projectForm !== undefined && <ProjectForm project={projectForm} onClose={() => setProjectForm(undefined)} />}
    </TasksContext.Provider>
  );
}
