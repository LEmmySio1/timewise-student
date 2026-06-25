import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TaskCard } from "@/components/TaskCard";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { useStore, type Category } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — FocusFlow" },
      { name: "description", content: "Your task list with real-time timers, planned vs actual time and progress." },
    ],
  }),
  component: TasksPage,
});

type Filter = "today" | "all" | "overdue" | "completed";

function TasksPage() {
  const { tasks } = useStore();
  const [filter, setFilter] = useState<Filter>("today");
  const [cat, setCat] = useState<Category | "all">("all");

  const today = new Date().toISOString().slice(0, 10);
  let list = tasks;
  if (filter === "today") list = list.filter((t) => t.dueDate === today);
  if (filter === "overdue") list = list.filter((t) => t.dueDate < today && t.status !== "completed");
  if (filter === "completed") list = list.filter((t) => t.status === "completed");
  if (cat !== "all") list = list.filter((t) => t.category === cat);

  list = [...list].sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "today", label: "Today" }, { id: "all", label: "All" }, { id: "overdue", label: "Overdue" }, { id: "completed", label: "Done" },
  ];
  const cats: { id: Category | "all"; label: string }[] = [
    { id: "all", label: "All" }, { id: "study", label: "Study" }, { id: "assignment", label: "Assignment" },
    { id: "exercise", label: "Exercise" }, { id: "chores", label: "Chores" }, { id: "personal", label: "Personal" }, { id: "rest", label: "Rest" },
  ];

  return (
    <AppShell title="Tasks" subtitle="Your activities">
      <div className="flex gap-2 mb-3">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 mb-3 scrollbar-none">
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${cat === c.id ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center mt-6">
          <p className="text-sm text-muted-foreground">No tasks here. Tap + to add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => <TaskCard key={t.id} task={t} />)}
        </div>
      )}

      <AddTaskDialog />
    </AppShell>
  );
}
