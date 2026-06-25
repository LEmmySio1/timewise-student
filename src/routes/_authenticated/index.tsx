import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TaskCard } from "@/components/TaskCard";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { CATEGORY_META, formatDuration, formatTimer, getStreak, useStore } from "@/lib/store";
import { Flame, Play, Pause, ChevronRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "FocusFlow — Your day at a glance" },
      { name: "description", content: "See today's tasks, your active timer, streaks, and productivity at a glance." },
    ],
  }),
  component: Home,
});

function Home() {
  const { tasks, profile, timer, currentElapsed, pauseTimer, resumeTimer, startTimer } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const completed = todayTasks.filter((t) => t.status === "completed").length;
  const total = todayTasks.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const streak = getStreak(tasks);
  const activeTask = tasks.find((t) => t.id === timer.taskId);
  const upcoming = tasks
    .filter((t) => t.dueDate > today && t.status !== "completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  const quickStartCandidate = todayTasks.find((t) => t.status !== "completed");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.name.split(" ")[0] || "Friend";

  return (
    <AppShell>
      <section className="pt-6 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{firstName} 👋</h1>
        </div>
        <Link to="/profile" className="h-11 w-11 rounded-full bg-gradient-primary text-primary-foreground font-bold flex items-center justify-center shadow-soft">
          {profile.avatarLetter}
        </Link>
      </section>

      <section className="bg-gradient-hero rounded-3xl p-5 shadow-card border border-border/60 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider"><Sparkles className="h-3.5 w-3.5" /> Today's focus</div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-extrabold tabular-nums">{pct}<span className="text-xl text-muted-foreground">%</span></div>
              <p className="text-xs text-muted-foreground mt-1">{completed} of {total} tasks completed</p>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/25 text-warning-foreground">
                <Flame className="h-4 w-4" />
                <span className="font-bold text-sm">{streak} day streak</span>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      {activeTask ? (
        <section className="mt-4 bg-card rounded-3xl p-5 shadow-card border border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Active timer</p>
              <h3 className="font-bold mt-1">{activeTask.title}</h3>
              <p className="text-xs text-muted-foreground">{CATEGORY_META[activeTask.category].label} · planned {formatDuration(activeTask.plannedMinutes * 60)}</p>
            </div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-primary">{formatTimer(currentElapsed)}</div>
          </div>
          <div className="mt-4 flex gap-2">
            {timer.running ? (
              <button onClick={pauseTimer} className="flex-1 py-2.5 rounded-2xl bg-warning text-warning-foreground font-semibold flex items-center justify-center gap-2"><Pause className="h-4 w-4" /> Pause</button>
            ) : (
              <button onClick={resumeTimer} className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"><Play className="h-4 w-4" /> Resume</button>
            )}
            <Link to="/tasks" className="px-4 py-2.5 rounded-2xl bg-secondary font-semibold text-foreground">Details</Link>
          </div>
        </section>
      ) : quickStartCandidate ? (
        <section className="mt-4 bg-card rounded-3xl p-5 shadow-card border border-border/60 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Quick start</p>
            <h3 className="font-semibold mt-0.5 line-clamp-1">{quickStartCandidate.title}</h3>
            <p className="text-xs text-muted-foreground">Planned {formatDuration(quickStartCandidate.plannedMinutes * 60)}</p>
          </div>
          <button onClick={() => startTimer(quickStartCandidate.id)} className="h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground shadow-soft flex items-center justify-center">
            <Play className="h-5 w-5" />
          </button>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Today's schedule</h2>
          <Link to="/tasks" className="text-xs font-semibold text-primary flex items-center">See all <ChevronRight className="h-3 w-3" /></Link>
        </div>
        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No tasks for today yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayTasks.slice(0, 4).map((t) => <TaskCard key={t.id} task={t} compact />)}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold mb-3">Coming up</h2>
          <div className="space-y-2">
            {upcoming.map((t) => (
              <div key={t.id} className="bg-card rounded-2xl p-3 shadow-card border border-border/60 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: `color-mix(in oklab, var(--cat-${t.category}) 18%, white)`, color: `var(--cat-${t.category})` }}>
                  {new Date(t.dueDate).getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-1">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{CATEGORY_META[t.category].label} · {formatDuration(t.plannedMinutes * 60)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <AddTaskDialog />
    </AppShell>
  );
}
