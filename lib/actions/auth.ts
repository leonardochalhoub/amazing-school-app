"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/supabase/types";

/**
 * Public signup is TEACHER-ONLY.
 *
 * A role=student signup is only accepted when paired with a valid, unclaimed
 * student invitation token — that path is used by /join to create the auth
 * user on the fly. Every other student arrives via classroom_members (their
 * teacher added them, then shared the invite link).
 */
export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const requestedRole = (formData.get("role") as Role | null) ?? "teacher";
  const inviteToken = (formData.get("inviteToken") as string | null) ?? "";

  let role: Role = "teacher";
  if (requestedRole === "student") {
    if (!inviteToken) {
      return {
        error:
          "Students join through a teacher's invitation link, not the public signup page.",
      };
    }
    const { data: invite } = await admin
      .from("student_invitations")
      .select("id, accepted_at, expires_at")
      .eq("token", inviteToken)
      .maybeSingle();
    const row = invite as {
      id: string;
      accepted_at: string | null;
      expires_at: string | null;
    } | null;
    if (!row) return { error: "Invalid invitation token." };
    if (row.accepted_at)
      return { error: "This invitation has already been used." };
    if (row.expires_at && new Date(row.expires_at) < new Date())
      return { error: "This invitation has expired." };
    role = "student";
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Failed to create account" };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role,
    avatar_url: null,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  redirect(role === "teacher" ? "/teacher" : "/student");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Authentication failed" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(profile?.role === "teacher" ? "/teacher" : "/student");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
