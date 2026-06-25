import { createServerFn } from "@tanstack/react-start";

export interface CreateConfirmedAccountInput {
  fullName: string;
  email: string;
  password: string;
  school?: string;
  course?: string;
}

function validate(input: unknown): CreateConfirmedAccountInput {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  const i = input as Record<string, unknown>;

  if (typeof i.fullName !== "string") throw new Error("Name required");
  const fullName = i.fullName.trim();
  if (!fullName) throw new Error("Name required");
  if (fullName.length > 80) throw new Error("Name must be 80 characters or fewer");

  if (typeof i.email !== "string") throw new Error("Email required");
  const email = i.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
  if (email.length > 255) throw new Error("Email must be 255 characters or fewer");

  if (typeof i.password !== "string") throw new Error("Password required");
  if (i.password.length < 6) throw new Error("Password must be at least 6 characters");
  if (i.password.length > 72) throw new Error("Password must be 72 characters or fewer");

  const school = typeof i.school === "string" ? i.school.trim().slice(0, 120) : "";
  const course = typeof i.course === "string" ? i.course.trim().slice(0, 120) : "";

  return {
    fullName,
    email,
    password: i.password,
    ...(school ? { school } : {}),
    ...(course ? { course } : {}),
  };
}

export const createConfirmedAccount = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("Account could not be created");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        email: data.email,
        school: data.school ?? null,
        course: data.course ?? null,
      })
      .eq("id", created.user.id);

    if (profileError) throw new Error(profileError.message);

    return { ok: true };
  });
