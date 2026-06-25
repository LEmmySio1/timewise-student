import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, CATEGORY_META, formatDuration, getStreak } from "@/lib/store";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame, TrendingUp, Lightbulb, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/statistics")({
  head: () => ({
    meta: [
      { title: "Statistics — FocusFlow" },
      { name: "description", content: "Visual insights into your study time, productivity score, streaks and category breakdown." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { tasks } = useStore();

  const byCat = (Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map((cat) => {
    const list = tasks.filter((t) => t.category === cat);
    const planned = list.reduce((s, t) => s + t.plannedMinutes * 60, 0);
    const actual = list.reduce((s, t) => s + t.actualSeconds, 0);
    return { name: CATEGORY_META[cat].label, planned: Math.round(planned / 60), actual: Math.round(actual / 60), cat };
  }).filter((d) => d.planned + d.actual > 0);

  const totalCompleted = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const completionPct = totalTasks ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  const missed = tasks.filter((t) => t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== "completed").length;
  const totalHours = (tasks.reduce((s, t) => s + t.actualSeconds, 0) / 3600).toFixed(1);
  const streak = getStreak(tasks);

  const donutData = [
    { name: "Completed", value: totalCompleted, color: "var(--success)" },
    { name: "In progress", value: tasks.filter((t) => t.status === "in_progress").length, color: "var(--primary)" },
    { name: "Pending", value: tasks.filter((t) => t.status === "not_started").length, color: "var(--muted-foreground)" },
  ].filter((d) => d.value > 0);

  const mostCat = [...byCat].sort((a, b) => b.actual - a.actual)[0];
  const insights = [
    mostCat && `${mostCat.name} is consuming most of your time (${formatDuration(mostCat.actual * 60)}).`,
    missed > 0 && `You have ${missed} overdue ${missed === 1 ? "task" : "tasks"} this period.`,
    streak >= 2 && `Nice — you're on a ${streak} day completion streak. Keep it up!`,
    completionPct >= 70 && `Great consistency — ${completionPct}% completion rate.`,
  ].filter(Boolean) as string[];

  return (
    <AppShell title="Statistics" subtitle="Your insights">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Productivity" value={`${completionPct}%`} accent="primary" />
        <MetricCard icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak}d`} accent="warning" />
        <MetricCard icon={<Trophy className="h-4 w-4" />} label="Done" value={`${totalCompleted}`} accent="success" />
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Hours logged" value={totalHours} accent="primary" />
      </div>

      <section className="bg-card rounded-3xl p-4 shadow-card border border-border/60 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Planned vs actual</h3>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">minutes</span>
        </div>
        {byCat.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Start tracking to see your data.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCat} barCategoryGap={14}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                <Bar dataKey="planned" radius={[6, 6, 0, 0]} fill="var(--muted-foreground)" opacity={0.4} />
                <Bar dataKey="actual" radius={[6, 6, 0, 0]}>
                  {byCat.map((d) => <Cell key={d.cat} fill={`var(--cat-${d.cat})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="bg-card rounded-3xl p-4 shadow-card border border-border/60 mb-4">
        <h3 className="font-bold mb-2">Task status</h3>
        {donutData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={38} outerRadius={62} paddingAngle={3} strokeWidth={0}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name}</div>
                  <span className="font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="bg-gradient-hero rounded-3xl p-4 border border-border/60 mb-4">
        <div className="flex items-center gap-2 mb-2 text-primary"><Lightbulb className="h-4 w-4" /> <h3 className="font-bold text-foreground">Smart insights</h3></div>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Complete tasks to unlock personalized insights.</p>
        ) : (
          <ul className="space-y-2">
            {insights.map((i, idx) => <li key={idx} className="text-sm text-foreground flex gap-2"><span className="text-primary">•</span>{i}</li>)}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "primary" | "warning" | "success" }) {
  const bg = accent === "primary" ? "bg-primary/10 text-primary" : accent === "warning" ? "bg-warning/20 text-warning-foreground" : "bg-success/15 text-success";
  return (
    <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-card">
      <div className={`inline-flex items-center justify-center h-7 w-7 rounded-full ${bg} mb-2`}>{icon}</div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-2xl font-extrabold mt-0.5">{value}</p>
    </div>
  );
}
