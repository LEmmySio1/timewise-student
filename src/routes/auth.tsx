import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createConfirmedAccount } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — FocusFlow" },
      { name: "description", content: "Sign in or create your FocusFlow account." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passSchema = z.string().min(6, "Password must be at least 6 characters").max(72);
const nameSchema = z.string().trim().min(1, "Name required").max(80);

function AuthPage() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" />;
  return <AuthCard />;
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function AuthCard() {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">FocusFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan your day. Track real time. Build streaks.</p>
        </div>

        <div className="bg-card rounded-3xl border border-border/60 shadow-elevated p-5">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm /></TabsContent>
            <TabsContent value="signup"><SignUpForm /></TabsContent>
            <TabsContent value="admin"><AdminLoginForm /></TabsContent>
          </Tabs>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          By continuing you agree to FocusFlow's terms.
        </p>
      </div>
    </div>
  );
}

function SignInForm() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const er = emailSchema.safeParse(email); if (!er.success) return toast.error(er.error.issues[0].message);
    const pr = passSchema.safeParse(password); if (!pr.success) return toast.error(pr.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: er.data, password: pr.data });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav({ to: "/" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="si-pass">Password</Label>
        <Input id="si-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground border-0">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login as user"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const nav = useNavigate();
  const createAccount = useServerFn(createConfirmedAccount);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [school, setSchool] = useState("");
  const [course, setCourse] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nr = nameSchema.safeParse(name); if (!nr.success) return toast.error(nr.error.issues[0].message);
    const er = emailSchema.safeParse(email); if (!er.success) return toast.error(er.error.issues[0].message);
    const pr = passSchema.safeParse(password); if (!pr.success) return toast.error(pr.error.issues[0].message);
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      await createAccount({
        data: {
          fullName: nr.data,
          email: er.data,
          password: pr.data,
          school,
          course,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({ email: er.data, password: pr.data });
      if (error) throw error;
      toast.success("Account created");
      nav({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="su-name">Full name</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="su-pass">Password</Label>
          <Input id="su-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="su-pass2">Confirm</Label>
          <Input id="su-pass2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="su-school">School (optional)</Label>
          <Input id="su-school" value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="su-course">Course (optional)</Label>
          <Input id="su-course" value={course} onChange={(e) => setCourse(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground border-0">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
      </Button>
    </form>
  );
}

function AdminLoginForm() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const er = emailSchema.safeParse(email); if (!er.success) return toast.error(er.error.issues[0].message);
    const pr = passSchema.safeParse(password); if (!pr.success) return toast.error(pr.error.issues[0].message);
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: er.data, password: pr.data });
    if (error || !data.user) { setBusy(false); return toast.error(error?.message ?? "Sign-in failed"); }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    setBusy(false);
    if (!isAdmin) {
      await supabase.auth.signOut();
      return toast.error("This account does not have administrator access");
    }
    toast.success("Welcome, administrator");
    nav({ to: "/admin" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-2xl bg-secondary text-secondary-foreground text-xs">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        Administrator access is restricted. Standard accounts are rejected.
      </div>
      <div>
        <Label htmlFor="ad-email">Admin email</Label>
        <Input id="ad-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="ad-pass">Password</Label>
        <Input id="ad-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login as administrator"}
      </Button>
    </form>
  );
}
