"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDays, todayKey } from "@/lib/dates";
import { logsToMap, streak } from "@/lib/habits";
import { DEFAULT_SETTINGS, type Habit, type LogMap, type Settings } from "@/lib/types";
import HabitForm from "./HabitForm";

export type HabitDraft = Omit<Habit, "id" | "position" | "start_date"> & { id?: string };

interface Ctx {
  ready: boolean;
  error: string | null;
  today: string;
  email: string | null;
  habits: Habit[];
  logs: LogMap;
  settings: Settings;
  tap: (h: Habit) => void;
  setDay: (h: Habit, day: string, value: number) => void;
  saveHabit: (d: HabitDraft) => Promise<string | null>;
  archiveHabit: (id: string) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  openForm: (h?: Habit) => void;
  toast: (msg: string) => void;
  reload: () => Promise<void>;
}

const HabitsContext = createContext<Ctx | null>(null);
export const useHabits = () => {
  const c = useContext(HabitsContext);
  if (!c) throw new Error("useHabits fuera de HabitsProvider");
  return c;
};

const HISTORY_DAYS = 400;

export default function HabitsProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(todayKey());
  const [email, setEmail] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<LogMap>({});
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [formHabit, setFormHabit] = useState<Habit | null | undefined>(undefined);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const logsRef = useRef(logs);
  logsRef.current = logs;

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);

  const reload = useCallback(async () => {
    const t = todayKey();
    setToday(t);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    setEmail(user.email ?? null);

    const [h, l, s] = await Promise.all([
      supabase.from("habits").select("*").is("archived_at", null).order("position").order("created_at"),
      supabase.from("habit_logs").select("habit_id, day, value").gte("day", addDays(t, -HISTORY_DAYS)),
      supabase.from("user_settings").select("*").maybeSingle(),
    ]);
    if (h.error || l.error || s.error) {
      setError((h.error || l.error || s.error)!.message);
      setReady(true);
      return;
    }
    setHabits((h.data as Habit[]).map((x) => ({ ...x, remind_time: x.remind_time?.slice(0, 5) ?? null })));
    setLogs(logsToMap(l.data));
    if (s.data) {
      setSettings({ ...DEFAULT_SETTINGS, ...(s.data as Settings) });
    } else {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_SETTINGS.timezone;
      const row = { ...DEFAULT_SETTINGS, email: user.email ?? null, timezone: tz };
      await supabase.from("user_settings").upsert(row);
      setSettings(row);
    }
    setError(null);
    setReady(true);
  }, [supabase]);

  useEffect(() => {
    reload();
    const onVis = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reload]);

  const setDay = useCallback(
    (h: Habit, day: string, value: number) => {
      const prev = logsRef.current[h.id]?.[day] ?? 0;
      setLogs((cur) => {
        const next = { ...cur, [h.id]: { ...(cur[h.id] ?? {}) } };
        if (value > 0) next[h.id][day] = value;
        else delete next[h.id][day];
        return next;
      });
      const req =
        value > 0
          ? supabase.from("habit_logs").upsert({ habit_id: h.id, day, value }, { onConflict: "habit_id,day" })
          : supabase.from("habit_logs").delete().eq("habit_id", h.id).eq("day", day);
      req.then(({ error }) => {
        if (error) {
          setLogs((cur) => ({ ...cur, [h.id]: { ...(cur[h.id] ?? {}), [day]: prev } }));
          toast("No se pudo guardar. Revisa tu conexión.");
        }
      });
    },
    [supabase, toast]
  );

  const tap = useCallback(
    (h: Habit) => {
      const v = logsRef.current[h.id]?.[today] ?? 0;
      let next: number;
      if (v >= h.target) next = 0;
      else next = h.type === "count" ? v + 1 : 1;
      setDay(h, today, next);
      if (next >= h.target && next > 0) {
        const s = streak({ ...logsRef.current, [h.id]: { ...(logsRef.current[h.id] ?? {}), [today]: next } }, h, today);
        toast(`Racha de ${s} ${s === 1 ? "día" : "días"} · ${h.name}`);
      } else if (h.type === "count" && next > 0) {
        toast(`${next} de ${h.target} ${h.unit}`);
      }
    },
    [today, setDay, toast]
  );

  const saveHabit = useCallback(
    async (d: HabitDraft) => {
      const payload = {
        name: d.name,
        cue: d.cue,
        type: d.type,
        target: d.type === "count" ? d.target : 1,
        unit: d.type === "count" ? d.unit : "",
        days: d.days,
        part: d.part,
        remind_time: d.remind_time || null,
        remind: d.remind,
        color: d.color,
      };
      if (d.id) {
        const { data, error } = await supabase.from("habits").update(payload).eq("id", d.id).select().single();
        if (error) return error.message;
        setHabits((hs) => hs.map((h) => (h.id === d.id ? { ...(data as Habit), remind_time: payload.remind_time } : h)));
        toast("Cambios guardados");
      } else {
        const position = habits.length ? Math.max(...habits.map((h) => h.position)) + 1 : 0;
        const { data, error } = await supabase
          .from("habits")
          .insert({ ...payload, position, start_date: today })
          .select()
          .single();
        if (error) return error.message;
        setHabits((hs) => [...hs, { ...(data as Habit), remind_time: payload.remind_time }]);
        toast("Hábito creado");
      }
      return null;
    },
    [supabase, habits, today, toast]
  );

  const updateHabit = useCallback(
    async (id: string, patch: Partial<Habit>) => {
      setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
      const { error } = await supabase.from("habits").update(patch).eq("id", id);
      if (error) toast("No se pudo guardar el cambio");
    },
    [supabase, toast]
  );

  const archiveHabit = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("habits").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (error) return toast("No se pudo eliminar");
      setHabits((hs) => hs.filter((h) => h.id !== id));
      toast("Hábito eliminado");
    },
    [supabase, toast]
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      const { error } = await supabase.from("user_settings").update({ ...patch, updated_at: new Date().toISOString() }).not("user_id", "is", null);
      if (error) toast("No se pudo guardar el ajuste");
    },
    [supabase, toast]
  );

  const value: Ctx = {
    ready,
    error,
    today,
    email,
    habits,
    logs,
    settings,
    tap,
    setDay,
    saveHabit,
    archiveHabit,
    updateHabit,
    updateSettings,
    openForm: (h) => setFormHabit(h ?? null),
    toast,
    reload,
  };

  return (
    <HabitsContext.Provider value={value}>
      {children}
      {formHabit !== undefined && <HabitForm habit={formHabit} onClose={() => setFormHabit(undefined)} />}
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </HabitsContext.Provider>
  );
}
