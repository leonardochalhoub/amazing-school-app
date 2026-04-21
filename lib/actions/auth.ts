"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardEligibleBadges } from "@/lib/gamification/award-badges";
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
  const location = ((formData.get("location") as string | null) ?? "").trim();
  const genderRaw = ((formData.get("gender") as string | null) ?? "").trim();

  // Location is required for every new account — teacher or student.
  // The column caps at 80 chars; anything longer is clipped.
  if (!location) {
    return {
      error:
        "A localização (cidade) é obrigatória no cadastro. Escolha na lista.",
    };
  }
  const locationTrimmed = location.slice(0, 80);

  // Gender — required for teacher signup (drives pt-BR wording:
  // Professor vs Professora). Students join via invite, where the
  // teacher sets gender on the roster row instead, so we only enforce
  // it when role === 'teacher'.
  const gender: "female" | "male" | null =
    genderRaw === "female" || genderRaw === "male" ? genderRaw : null;
  if (requestedRole === "teacher" && !gender) {
    return {
      error: "Selecione o gênero (masculino ou feminino) — obrigatório.",
    };
  }

  let role: Role = "teacher";
  // Full invitation row (not just the validation subset) so we can link
  // the roster + classroom right after creating the auth user, in the
  // same request. Client-side claimInvitation was racy on email-
  // confirmation setups — if the session wasn't active yet, the claim
  // failed silently and the student ended up unlinked.
  let inviteRow: {
    id: string;
    classroom_id: string | null;
    roster_student_id: string | null;
    email: string | null;
    display_name: string | null;
  } | null = null;
  if (requestedRole === "student") {
    if (!inviteToken) {
      return {
        error:
          "Students join through a teacher's invitation link, not the public signup page.",
      };
    }
    const { data: invite } = await admin
      .from("student_invitations")
      .select(
        "id, classroom_id, roster_student_id, email, display_name, accepted_at, expires_at",
      )
      .eq("token", inviteToken)
      .maybeSingle();
    const row = invite as
      | {
          id: string;
          classroom_id: string | null;
          roster_student_id: string | null;
          email: string | null;
          display_name: string | null;
          accepted_at: string | null;
          expires_at: string | null;
        }
      | null;
    if (!row) return { error: "Invalid invitation token." };
    if (row.accepted_at)
      return { error: "This invitation has already been used." };
    if (row.expires_at && new Date(row.expires_at) < new Date())
      return { error: "This invitation has expired." };
    role = "student";
    inviteRow = {
      id: row.id,
      classroom_id: row.classroom_id,
      roster_student_id: row.roster_student_id,
      email: row.email,
      display_name: row.display_name,
    };
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
    gender,
    location: locationTrimmed,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  // Link the roster + classroom RIGHT NOW, server-side, whenever we
  // have a valid invitation token. This replaces the previous client-
  // side claimInvitation call that was racing against Supabase's email-
  // confirmation flow.
  if (role === "student" && inviteRow) {
    try {
      if (inviteRow.roster_student_id) {
        await admin
          .from("roster_students")
          .update({
            auth_user_id: data.user.id,
            // Stamp the email too so future orphan-cleanup passes can
            // match by email as a safety net.
            email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", inviteRow.roster_student_id);
      }
      if (inviteRow.classroom_id) {
        await admin.from("classroom_members").upsert(
          {
            classroom_id: inviteRow.classroom_id,
            student_id: data.user.id,
          },
          { onConflict: "classroom_id,student_id" },
        );
      }
      await admin
        .from("student_invitations")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by_user_id: data.user.id,
        })
        .eq("id", inviteRow.id);
    } catch (err) {
      // Log but don't block signup — subsequent /student load has a
      // fallback that tries to match any remaining orphan roster by
      // email.
      console.error("signUp invite-link error:", err);
    }
  } else if (role === "student") {
    // No token (e.g. legacy path) — email-match fallback for any
    // previously-orphaned roster row.
    try {
      const { data: orphan } = await admin
        .from("roster_students")
        .select("id")
        .eq("email", email)
        .is("auth_user_id", null)
        .maybeSingle();
      const orphanId = (orphan as { id?: string } | null)?.id;
      if (orphanId) {
        await admin
          .from("roster_students")
          .update({ auth_user_id: data.user.id })
          .eq("id", orphanId)
          .is("auth_user_id", null);
      }
    } catch {
      // Non-fatal.
    }
  }

  // Evaluate badge rules now so the student walks in with at least the
  // `welcome_aboard` badge visible on their dashboard. Idempotent.
  if (role === "student") {
    try {
      await awardEligibleBadges(data.user.id);
    } catch (err) {
      console.error("signUp awardEligibleBadges error:", err);
    }
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

/**
 * Sign out without redirecting. Used by the /join page when a different
 * user is signed in and we need to stay on that URL so the invited student
 * can create their account.
 */
export async function signOutStay() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true as const };
}
