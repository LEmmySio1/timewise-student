import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUpdateInput {
  userId: string;
  fullName?: string;
  email?: string;
  role?: "user" | "admin";
}

function validate(input: unknown): AdminUpdateInput {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  const i = input as Record<string, unknown>;
  if (typeof i.userId !== "string" || !i.userId) throw new Error("userId required");
  const out: AdminUpdateInput = { userId: i.userId };
  if (i.fullName !== undefined) {
    if (typeof i.fullName !== "string") throw new Error("fullName must be string");
    out.fullName = i.fullName.trim().slice(0, 120);
  }
  if (i.email !== undefined) {
    if (typeof i.email !== "string") throw new Error("email must be string");
    const email = i.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    out.email = email;
  }
  if (i.role !== undefined) {
    if (i.role !== "user" && i.role !== "admin") throw new Error("Invalid role");
    out.role = i.role;
  }
  return out;
}

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;

    // Caller must be admin
    const { data: callerRoles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (rolesErr) throw new Error(rolesErr.message);
    const callerIsAdmin = (callerRoles ?? []).some((r) => r.role === "admin");
    if (!callerIsAdmin) throw new Error("Forbidden");

    // Check super-admin status of caller and target
    const { data: superRows } = await supabase
      .from("super_admins")
      .select("user_id")
      .in("user_id", [callerId, data.userId]);
    const supers = new Set((superRows ?? []).map((r) => r.user_id as string));
    const callerIsSuper = supers.has(callerId);
    const targetIsSuper = supers.has(data.userId);

    // Block non-super-admin from editing a super-admin (anyone other than self)
    if (targetIsSuper && !callerIsSuper && data.userId !== callerId) {
      throw new Error("Super administrators can only be edited by themselves");
    }

    // Role change requires super-admin
    if (data.role !== undefined && !callerIsSuper) {
      throw new Error("Only super administrators can change roles");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Update auth.users email if requested
    if (data.email) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        email: data.email,
        email_confirm: true,
      });
      if (authErr) throw new Error(authErr.message);
    }

    // Update profile
    const profilePatch: { full_name?: string; email?: string } = {};
    if (data.fullName !== undefined) profilePatch.full_name = data.fullName;
    if (data.email !== undefined) profilePatch.email = data.email;
    if (Object.keys(profilePatch).length > 0) {
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .update(profilePatch)
        .eq("id", data.userId);
      if (pErr) throw new Error(pErr.message);
    }

    // Role change (only super-admins reach here)
    if (data.role !== undefined) {
      if (targetIsSuper) throw new Error("Cannot change a super administrator's role");
      if (data.role === "admin") {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", data.userId)
          .eq("role", "admin");
        if (error) throw new Error(error.message);
        // Ensure they still have a 'user' role
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.userId, role: "user" }, { onConflict: "user_id,role" });
      }
    }

    return { ok: true };
  });
