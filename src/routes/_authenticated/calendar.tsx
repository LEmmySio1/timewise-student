import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore, CATEGORY_META, formatDuration } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — FocusFlow" },
      { name: "description", content: "Monthly view of your scheduled activities, deadlines and completed sessions." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { tasks } = useStore();
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [selected, setSelected] = useState<string>(new Date().toISOString().slice(0, 10));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const cells: ({ date: string; day: number } | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({ date: iso, day: d });
  }

  const tasksByDate = tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
    (acc[t.dueDate] ||= []).push(t); return acc;
  }, {});

  const selectedTasks = tasksByDate[selected] || [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell title="Calendar" subtitle="Plan your month">
      <div className="bg-card rounded-3xl p-4 shadow-card border border-border/60">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="font-bold capitalize">{monthLabel}</h2>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground uppercase mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const dayTasks = tasksByDate[c.date] || [];
            const cats = [...new Set(dayTasks.map((t) => t.category))].slice(0, 3);
            const isToday = c.date === today;
            const isSelected = c.date === selected;
            return (
              <button
                key={c.date}
                onClick={() => setSelected(c.date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-all ${
                  isSelected ? "bg-gradient-primary text-primary-foreground font-bold shadow-soft" : isToday ? "bg-secondary font-bold text-primary" : "hover:bg-secondary text-foreground"
                }`}
              >
                <span>{c.day}</span>
                {cats.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {cats.map((cat) => <span key={cat} className="h-1 w-1 rounded-full" style={{ background: isSelected ? "white" : `var(--cat-${cat})` }} />)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-5">
        <h3 className="font-bold mb-3">{new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h3>
        {selectedTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No activities scheduled.</div>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map((t) => (
              <div key={t.id} className="bg-card rounded-2xl p-3 border border-border/60 shadow-card flex items-center gap-3">
                <span className="h-10 w-1.5 rounded-full" style={{ background: `var(--cat-${t.category})` }} />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm line-clamp-1 ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">{CATEGORY_META[t.category].label} · planned {formatDuration(t.plannedMinutes * 60)} · actual {formatDuration(t.actualSeconds)}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                  t.status === "completed" ? "bg-success/15 text-success" : t.status === "in_progress" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}>{t.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 bg-card rounded-2xl p-4 border border-border/60">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Categories</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--cat-${k})` }} />
              <span className="text-foreground">{CATEGORY_META[k].label}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
