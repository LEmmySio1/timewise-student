import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type Category = "study" | "assignment" | "exercise" | "chores" | "personal" | "rest";
export type Priority = "low" | "medium" | "high";
export type Status = "not_started" | "in_progress" | "completed";

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: Category;
  priority: Priority;
  dueDate: string;
  plannedMinutes: number;
  actualSeconds: number;
  status: Status;
  createdAt: string;
  completedAt?: string;
}

export interface TimerState {
  taskId: string | null;
  startedAt: number | null;
  accumulated: number;
  running: boolean;
}

export interface Profile {
  name: string;
  email: string;
  avatarLetter: string;
  school?: string;
  course?: string;
}

interface StoreCtx {
  tasks: Task[];
  addTask: (t: Omit<Task, "id" | "actualSeconds" | "status" | "createdAt">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  timer: TimerState;
  startTimer: (taskId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  currentElapsed: number;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);
const LEGACY_KEY = "focusflow:v1";

interface DbTaskRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  due_date: string;
  planned_minutes: number;
  actual_seconds: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

function rowToTask(r: DbTaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    category: r.category as Category,
    priority: r.priority as Priority,
    dueDate: r.due_date,
    plannedMinutes: r.planned_minutes,
    actualSeconds: r.actual_seconds,
    status: r.status as Status,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
  };
}

function emptyProfile(): Profile {
  return { name: "", email: "", avatarLetter: "?" };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [timer, setTimer] = useState<TimerState>({ taskId: null, startedAt: null, accumulated: 0, running: false });
  const [tick, setTick] = useState(0);

  // Load tasks + profile when user changes
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setProfile(emptyProfile());
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: tRows }, { data: pRow }] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      let loaded: Task[] = (tRows ?? []).map(rowToTask);

      // First-login localStorage migration
      if (loaded.length === 0 && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LEGACY_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { tasks?: Task[] };
            const legacy = parsed.tasks ?? [];
            if (legacy.length > 0) {
              const rows = legacy.map((t) => ({
                user_id: user.id,
                title: t.title,
                description: t.description ?? null,
                category: t.category,
                priority: t.priority,
                due_date: t.dueDate,
                planned_minutes: t.plannedMinutes,
                actual_seconds: t.actualSeconds ?? 0,
                status: t.status,
                completed_at: t.completedAt ?? null,
              }));
              const { data: inserted } = await supabase.from("tasks").insert(rows).select("*");
              if (inserted) {
                loaded = inserted.map(rowToTask);
                toast.success(`Imported ${loaded.length} tasks from this device`);
              }
              localStorage.removeItem(LEGACY_KEY);
            }
          }
        } catch {/* ignore */}
      }
      setTasks(loaded);

      const name = pRow?.full_name?.trim() || user.email?.split("@")[0] || "Friend";
      setProfile({
        name,
        email: pRow?.email || user.email || "",
        avatarLetter: (name[0] ?? "?").toUpperCase(),
        school: pRow?.school ?? undefined,
        course: pRow?.course ?? undefined,
      });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Tick for active timer
  useEffect(() => {
    if (!timer.running) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [timer.running]);

  const currentElapsed = (() => {
    if (!timer.running || !timer.startedAt) return timer.accumulated;
    return timer.accumulated + Math.floor((Date.now() - timer.startedAt) / 1000);
  })();
  void tick;

  const persistTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const dbPatch: {
      title?: string;
      description?: string | null;
      category?: string;
      priority?: string;
      due_date?: string;
      planned_minutes?: number;
      actual_seconds?: number;
      status?: string;
      completed_at?: string | null;
    } = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.description !== undefined) dbPatch.description = patch.description ?? null;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.priority !== undefined) dbPatch.priority = patch.priority;
    if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
    if (patch.plannedMinutes !== undefined) dbPatch.planned_minutes = patch.plannedMinutes;
    if (patch.actualSeconds !== undefined) dbPatch.actual_seconds = patch.actualSeconds;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.completedAt !== undefined) dbPatch.completed_at = patch.completedAt ?? null;
    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await supabase.from("tasks").update(dbPatch).eq("id", id);
    if (error) toast.error("Failed to save");
  }, []);

  const addTask: StoreCtx["addTask"] = (t) => {
    if (!user) { toast.error("Sign in to add tasks"); return; }
    const tempId = crypto.randomUUID();
    const optimistic: Task = { ...t, id: tempId, actualSeconds: 0, status: "not_started", createdAt: new Date().toISOString() };
    setTasks((prev) => [optimistic, ...prev]);
    (async () => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: t.title,
          description: t.description ?? null,
          category: t.category,
          priority: t.priority,
          due_date: t.dueDate,
          planned_minutes: t.plannedMinutes,
        })
        .select("*")
        .single();
      if (error || !data) { toast.error("Failed to add task"); setTasks((p) => p.filter((x) => x.id !== tempId)); return; }
      setTasks((p) => p.map((x) => (x.id === tempId ? rowToTask(data) : x)));
    })();
  };

  const updateTask: StoreCtx["updateTask"] = (id, patch) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    void persistTask(id, patch);
  };

  const deleteTask: StoreCtx["deleteTask"] = (id) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    void supabase.from("tasks").delete().eq("id", id);
  };

  const toggleComplete: StoreCtx["toggleComplete"] = (id) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const next: Task = t.status === "completed"
        ? { ...t, status: "not_started", completedAt: undefined }
        : { ...t, status: "completed", completedAt: new Date().toISOString() };
      void persistTask(id, { status: next.status, completedAt: next.completedAt });
      return next;
    }));
  };

  const flushRunningTime = (commit = true) => {
    setTimer((cur) => {
      if (!cur.taskId) return { taskId: null, startedAt: null, accumulated: 0, running: false };
      const elapsed = cur.running && cur.startedAt
        ? cur.accumulated + Math.floor((Date.now() - cur.startedAt) / 1000)
        : cur.accumulated;
      if (commit && elapsed > 0) {
        const taskId = cur.taskId;
        setTasks((prev) => prev.map((t) => {
          if (t.id !== taskId) return t;
          const newSeconds = t.actualSeconds + elapsed;
          const newStatus: Status = t.status === "completed" ? t.status : "in_progress";
          void persistTask(t.id, { actualSeconds: newSeconds, status: newStatus });
          return { ...t, actualSeconds: newSeconds, status: newStatus };
        }));
        if (user) {
          const end = new Date();
          const start = new Date(end.getTime() - elapsed * 1000);
          void supabase.from("activity_logs").insert({
            user_id: user.id,
            task_id: taskId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            duration_seconds: elapsed,
          });
        }
      }
      return { taskId: null, startedAt: null, accumulated: 0, running: false };
    });
  };

  const startTimer: StoreCtx["startTimer"] = (taskId) => {
    flushRunningTime(true);
    setTimer({ taskId, startedAt: Date.now(), accumulated: 0, running: true });
    setTasks((p) => p.map((t) => (t.id === taskId && t.status !== "completed" ? { ...t, status: "in_progress" } : t)));
    void persistTask(taskId, { status: "in_progress" });
  };

  const pauseTimer = () => {
    setTimer((cur) => {
      if (!cur.running || !cur.startedAt) return cur;
      const acc = cur.accumulated + Math.floor((Date.now() - cur.startedAt) / 1000);
      return { ...cur, running: false, startedAt: null, accumulated: acc };
    });
  };

  const resumeTimer = () => {
    setTimer((cur) => {
      if (cur.running || !cur.taskId) return cur;
      return { ...cur, running: true, startedAt: Date.now() };
    });
  };

  const stopTimer = () => flushRunningTime(true);

  const updateProfile: StoreCtx["updateProfile"] = async (p) => {
    if (!user) return;
    setProfile((cur) => ({ ...cur, ...p, avatarLetter: ((p.name ?? cur.name)[0] ?? "?").toUpperCase() }));
    const dbPatch: { full_name?: string; school?: string | null; course?: string | null } = {};
    if (p.name !== undefined) dbPatch.full_name = p.name;
    if (p.school !== undefined) dbPatch.school = p.school ?? null;
    if (p.course !== undefined) dbPatch.course = p.course ?? null;
    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await supabase.from("profiles").update(dbPatch).eq("id", user.id);
    if (error) toast.error("Failed to update profile");
  };

  return (
    <Ctx.Provider value={{
      tasks, addTask, updateTask, deleteTask, toggleComplete,
      timer, startTimer, pauseTimer, resumeTimer, stopTimer, currentElapsed,
      profile, updateProfile,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

export const CATEGORY_META: Record<Category, { label: string; color: string; bg: string }> = {
  study: { label: "Study", color: "text-study", bg: "bg-study" },
  assignment: { label: "Assignment", color: "text-assignment", bg: "bg-assignment" },
  exercise: { label: "Exercise", color: "text-exercise", bg: "bg-exercise" },
  chores: { label: "Chores", color: "text-chores", bg: "bg-chores" },
  personal: { label: "Personal", color: "text-personal", bg: "bg-personal" },
  rest: { label: "Rest", color: "text-rest", bg: "bg-rest" },
};

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 && h === 0 ? `${s}s` : ""}`.trim();
  return `${s}s`;
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function getStreak(tasks: Task[]): number {
  const completedByDay = new Set(
    tasks.filter((t) => t.status === "completed" && t.completedAt).map((t) => t.completedAt!.slice(0, 10)),
  );
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (completedByDay.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}
