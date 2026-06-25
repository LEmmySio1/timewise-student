import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { adminUpdateUser } from "@/lib/admin.functions";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users, ListTodo, CheckCircle2, TrendingUp, Search, ShieldOff, ShieldCheck, Trash2, ArrowLeft, Loader2, Megaphone, Pencil, Crown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — FocusFlow" }] }),
  component: AdminPage,
});

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  school: string | null;
  course: string | null;
  account_status: string;
  created_at: string;
}

interface TaskRow {
  id: string;
  user_id: string;
  status: string;
  actual_seconds: number;
  created_at: string;
  completed_at: string | null;
}

function AdminPage() {
  const { role, loading, isSuperAdmin, user } = useAuth();
  const nav = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, "user" | "admin">>({});
  const [superSet, setSuperSet] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (loading) return;
    if (role !== "admin") {
      toast.error("Administrator access required");
      nav({ to: "/" });
    }
  }, [role, loading, nav]);

  const refresh = async () => {
    setBusy(true);
    const [{ data: p }, { data: t }, { data: r }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, user_id, status, actual_seconds, created_at, completed_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("super_admins").select("user_id"),
    ]);
    setProfiles((p as ProfileRow[]) ?? []);
    setTasks((t as TaskRow[]) ?? []);
    const rmap: Record<string, "user" | "admin"> = {};
    ((r as { user_id: string; role: "user" | "admin" }[]) ?? []).forEach((row) => {
      if (row.role === "admin") rmap[row.user_id] = "admin";
      else if (!rmap[row.user_id]) rmap[row.user_id] = "user";
    });
    setRolesByUser(rmap);
    setSuperSet(new Set(((s as { user_id: string }[]) ?? []).map((x) => x.user_id)));
    setBusy(false);
  };

  useEffect(() => {
    if (role !== "admin") return;
    void refresh();
  }, [role]);

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const activeUsers = profiles.filter((p) => p.account_status === "active").length;
    const totalTasks = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const completionRate = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
    const userIdsActiveToday = new Set(
      tasks.filter((t) => t.completed_at && t.completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).map((t) => t.user_id),
    );
    const tasksByUser = tasks.reduce<Record<string, { total: number; done: number; secs: number }>>((acc, t) => {
      acc[t.user_id] ??= { total: 0, done: 0, secs: 0 };
      acc[t.user_id].total++;
      if (t.status === "completed") acc[t.user_id].done++;
      acc[t.user_id].secs += t.actual_seconds;
      return acc;
    }, {});
    const productivityScores = Object.values(tasksByUser).map((u) => (u.total ? (u.done / u.total) * 100 : 0));
    const avgProductivity = productivityScores.length ? Math.round(productivityScores.reduce((a, b) => a + b, 0) / productivityScores.length) : 0;

    const mostActive = profiles
      .map((p) => ({ ...p, ...tasksByUser[p.id] }))
      .filter((p) => p.total)
      .sort((a, b) => (b.secs ?? 0) - (a.secs ?? 0))
      .slice(0, 5);

    const days: { date: string; users: number; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayTasks = tasks.filter((t) => t.completed_at && t.completed_at.slice(0, 10) === key);
      days.push({
        date: d.toLocaleDateString(undefined, { weekday: "short" }),
        users: new Set(dayTasks.map((t) => t.user_id)).size,
        completed: dayTasks.length,
      });
    }

    const sorted = [...profiles].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const growth: { week: string; total: number }[] = [];
    let cum = 0;
    for (let i = 5; i >= 0; i--) {
      const end = new Date(); end.setDate(end.getDate() - i * 7);
      const endIso = end.toISOString();
      cum = sorted.filter((p) => p.created_at <= endIso).length;
      growth.push({ week: `${end.getMonth() + 1}/${end.getDate()}`, total: cum });
    }

    return { totalUsers, activeUsers, totalTasks, completed, completionRate, activeToday: userIdsActiveToday.size, avgProductivity, mostActive, days, growth };
  }, [profiles, tasks]);

  const filtered = profiles.filter((p) =>
    !query ||
    p.full_name.toLowerCase().includes(query.toLowerCase()) ||
    p.email.toLowerCase().includes(query.toLowerCase()) ||
    (p.school ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  const canEdit = (p: ProfileRow) => {
    if (superSet.has(p.id) && !isSuperAdmin && p.id !== user?.id) return false;
    return true;
  };

  const toggleStatus = async (p: ProfileRow) => {
    if (!canEdit(p)) return toast.error("Cannot modify a super administrator");
    const next = p.account_status === "active" ? "disabled" : "active";
    const { error } = await supabase.from("profiles").update({ account_status: next }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setProfiles((cur) => cur.map((x) => (x.id === p.id ? { ...x, account_status: next } : x)));
    toast.success(`Account ${next}`);
  };

  const deleteUser = async (p: ProfileRow) => {
    if (superSet.has(p.id)) return toast.error("Super administrators cannot be deleted");
    if (!confirm(`Delete profile for ${p.email}? Their tasks will also be removed.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    setProfiles((cur) => cur.filter((x) => x.id !== p.id));
    toast.success("Profile deleted");
  };

  if (loading || role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-5 py-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => nav({ to: "/" })} className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></button>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-primary font-bold flex items-center gap-1">
                {isSuperAdmin && <Crown className="h-3 w-3" />} {isSuperAdmin ? "Super Administrator" : "Administrator"}
              </p>
              <h1 className="text-2xl font-extrabold">Platform overview</h1>
            </div>
          </div>
        </header>

        {busy ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <KCard icon={Users} label="Total users" value={stats.totalUsers} />
              <KCard icon={TrendingUp} label="Active users" value={stats.activeUsers} />
              <KCard icon={ListTodo} label="Total tasks" value={stats.totalTasks} />
              <KCard icon={CheckCircle2} label="Tasks completed" value={stats.completed} />
              <KCard icon={TrendingUp} label="Avg productivity" value={`${stats.avgProductivity}%`} />
              <KCard icon={Users} label="Active today" value={stats.activeToday} />
              <KCard icon={CheckCircle2} label="Completion rate" value={`${stats.completionRate}%`} />
              <KCard icon={TrendingUp} label="Tasks / user" value={stats.totalUsers ? Math.round(stats.totalTasks / stats.totalUsers) : 0} />
            </section>

            <section className="grid md:grid-cols-2 gap-4 mb-6">
              <Card title="Daily activity (last 7 days)">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="users" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="completed" fill="var(--success)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="User growth">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </section>

            <section className="mb-6">
              <Card title="Most active users">
                {stats.mostActive.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No activity yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {stats.mostActive.map((u) => (
                      <div key={u.id} className="py-2 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold">{u.full_name || u.email}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-bold">{((u.secs ?? 0) / 3600).toFixed(1)}h tracked</p>
                          <p className="text-muted-foreground">{u.done}/{u.total} done</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>

            <section className="mb-6">
              <Card title="User management">
                <div className="flex items-center gap-2 mb-3 bg-secondary rounded-xl px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, school" className="flex-1 bg-transparent py-2 text-sm outline-none" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">Role</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((p) => {
                        const isSuper = superSet.has(p.id);
                        const editable = canEdit(p);
                        const r = rolesByUser[p.id] ?? "user";
                        return (
                          <tr key={p.id}>
                            <td className="py-2 pr-3 font-medium flex items-center gap-1.5">
                              {isSuper && <Crown className="h-3.5 w-3.5 text-warning" />}
                              {p.full_name || "—"}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">{p.email}</td>
                            <td className="py-2 pr-3">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isSuper ? "bg-warning/15 text-warning-foreground" : r === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {isSuper ? "Super Admin" : r}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.account_status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                                {p.account_status}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => editable && setEditing(p)}
                                  disabled={!editable}
                                  title={editable ? "Edit" : "Locked: super administrator"}
                                  className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => toggleStatus(p)}
                                  disabled={!editable}
                                  title={p.account_status === "active" ? "Disable" : "Activate"}
                                  className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                  {p.account_status === "active" ? <ShieldOff className="h-4 w-4 text-warning-foreground" /> : <ShieldCheck className="h-4 w-4 text-success" />}
                                </button>
                                <button
                                  onClick={() => deleteUser(p)}
                                  disabled={isSuper}
                                  title={isSuper ? "Super administrators cannot be deleted" : "Delete"}
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No users match.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {!isSuperAdmin && (
                  <p className="text-[11px] text-muted-foreground mt-3">Only super administrators can change user roles. You can edit names and emails of regular accounts.</p>
                )}
              </Card>
            </section>

            <Announcements />
          </>
        )}
      </div>

      <EditUserDialog
        user={editing}
        currentRole={editing ? rolesByUser[editing.id] ?? "user" : "user"}
        isSuper={editing ? superSet.has(editing.id) : false}
        callerIsSuper={isSuperAdmin}
        onClose={() => setEditing(null)}
        onSaved={async () => { setEditing(null); await refresh(); }}
      />
    </div>
  );
}

function EditUserDialog({
  user, currentRole, isSuper, callerIsSuper, onClose, onSaved,
}: {
  user: ProfileRow | null;
  currentRole: "user" | "admin";
  isSuper: boolean;
  callerIsSuper: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const update = useServerFn(adminUpdateUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.full_name);
      setEmail(user.email);
      setRole(currentRole);
    }
  }, [user, currentRole]);

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Valid email required");
    setSaving(true);
    try {
      const payload: { userId: string; fullName?: string; email?: string; role?: "user" | "admin" } = {
        userId: user.id,
      };
      if (name.trim() !== user.full_name) payload.fullName = name.trim();
      if (email.trim().toLowerCase() !== user.email.toLowerCase()) payload.email = email.trim().toLowerCase();
      if (callerIsSuper && !isSuper && role !== currentRole) payload.role = role;
      await update({ data: payload });
      toast.success("User updated");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update name, email{callerIsSuper && !isSuper ? ", and role" : ""}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-name">Full name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
          </div>
          <div>
            <Label>Role</Label>
            {isSuper ? (
              <p className="text-xs text-muted-foreground py-2">This account is a super administrator. Its role cannot be changed.</p>
            ) : !callerIsSuper ? (
              <p className="text-xs text-muted-foreground py-2">Current role: <span className="font-semibold uppercase">{currentRole}</span>. Only super administrators can change roles.</p>
            ) : (
              <Select value={role} onValueChange={(v) => setRole(v as "user" | "admin")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <Button onClick={submit} disabled={saving} className="w-full bg-gradient-primary text-primary-foreground border-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card p-4">
      <h3 className="font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function KCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-card p-4">
      <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-primary/10 text-primary mb-2"><Icon className="h-4 w-4" /></div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-2xl font-extrabold mt-0.5">{value}</p>
    </div>
  );
}

interface Announcement { id: string; title: string; body: string; created_at: string }

function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("announcements").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems((data as Announcement[]) ?? []));
  }, []);

  const publish = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    setBusy(true);
    const { data, error } = await supabase.from("announcements").insert({ title: title.trim(), body: body.trim() }).select("*").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setItems((cur) => [data as Announcement, ...cur]);
    setTitle(""); setBody("");
    toast.success("Announcement published");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((cur) => cur.filter((x) => x.id !== id));
  };

  return (
    <section>
      <Card title="System announcements">
        <div className="space-y-2 mb-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body" rows={3} />
          <Button onClick={publish} disabled={busy} className="bg-primary text-primary-foreground">
            <Megaphone className="h-4 w-4 mr-2" /> Publish
          </Button>
        </div>
        <div className="divide-y divide-border">
          {items.length === 0 ? <p className="text-sm text-muted-foreground py-4">No announcements yet.</p> : items.map((a) => (
            <div key={a.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => remove(a.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
