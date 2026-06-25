import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "admin";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setRole(null);
        setIsSuperAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      const [{ data: rolesData }, { data: superData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        supabase.from("super_admins").select("user_id").eq("user_id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const roles = (rolesData ?? []).map((r) => r.role as AppRole);
      setRole(roles.includes("admin") ? "admin" : roles[0] ?? "user");
      setIsSuperAdmin(!!superData);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setIsSuperAdmin(false);
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, role, isSuperAdmin, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
