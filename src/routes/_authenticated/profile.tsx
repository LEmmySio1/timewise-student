import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, getStreak } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Bell, Lock, Palette, Settings, Users, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — FocusFlow" },
      { name: "description", content: "View your productivity profile, streak and account preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { tasks, profile } = useStore();
  const { signOut, role } = useAuth();
  const nav = useNavigate();
  const streak = getStreak(tasks);
  const totalHours = (tasks.reduce((s, t) => s + t.actualSeconds, 0) / 3600).toFixed(1);
  const completed = tasks.filter((t) => t.status === "completed").length;
  const score = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const sections: { icon: typeof Bell; label: string; hint?: string }[] = [
    { icon: Users, label: "Friends", hint: "Coming soon" },
    { icon: Bell, label: "Notifications" },
    { icon: Palette, label: "Themes" },
    { icon: Lock, label: "Privacy" },
    { icon: Settings, label: "Account settings" },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    nav({ to: "/auth" });
  };

  return (
    <AppShell>
      <section className="pt-8 pb-6 text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-4xl font-extrabold shadow-elevated">
          {profile.avatarLetter}
        </div>
        <h1 className="text-2xl font-extrabold mt-4">{profile.name}</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
        {profile.school || profile.course ? (
          <p className="text-xs text-muted-foreground mt-1">{[profile.course, profile.school].filter(Boolean).join(" · ")}</p>
        ) : null}
        {role === "admin" && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
            <ShieldCheck className="h-3 w-3" /> Administrator
          </div>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Productivity" value={`${score}%`} />
        <Stat label="Streak" value={`${streak}d`} />
        <Stat label="Hours" value={totalHours} />
      </section>

      {role === "admin" && (
        <button onClick={() => nav({ to: "/admin" })} className="mb-3 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Open admin dashboard
        </button>
      )}

      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 px-1">Preferences</p>
        <div className="bg-card rounded-3xl border border-border/60 shadow-card divide-y divide-border overflow-hidden">
          {sections.map(({ icon: Icon, label, hint }) => (
            <button key={label} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary transition-colors">
              <span className="h-9 w-9 rounded-xl bg-secondary text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></span>
              <span className="flex-1 font-medium text-sm">{label}</span>
              {hint && <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{hint}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <button onClick={handleSignOut} className="mt-5 w-full py-3 rounded-2xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-2">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-2xl p-3 border border-border/60 shadow-card text-center">
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">{label}</p>
    </div>
  );
}
