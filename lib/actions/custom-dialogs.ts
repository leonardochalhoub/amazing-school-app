"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";

export type CustomDialogTurn =
  | { speaker: "ai"; text: string; pt?: string }
  | { speaker: "user"; target: string; pt_hint?: string };

export interface CustomDialog {
  id: string;
  teacher_id: string;
  title: string;
  character: string | null;
  band: string | null;
  pt_summary: string | null;
  turns: CustomDialogTurn[];
  is_public: boolean;
  updated_at: string;
}

function normalizeTurn(t: unknown): CustomDialogTurn | null {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  if (o.speaker === "ai") {
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if (!text) return null;
    return {
      speaker: "ai",
      text,
      pt: typeof o.pt === "string" ? o.pt : undefined,
    };
  }
  if (o.speaker === "user") {
    const target = typeof o.target === "string" ? o.target.trim() : "";
    if (!target) return null;
    return {
      speaker: "user",
      target,
      pt_hint: typeof o.pt_hint === "string" ? o.pt_hint : undefined,
    };
  }
  return null;
}

export interface SaveCustomDialogInput {
  id?: string;
  title: string;
  character?: string;
  band?: string;
  pt_summary?: string;
  turns: unknown[];
  is_public: boolean;
}

/**
 * Upsert a teacher-authored dialog. New dialogs (no id) are inserted;
 * existing dialogs are updated only when the caller owns them.
 */
export async function saveCustomDialog(
  input: SaveCustomDialogInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole(profile?.role as string | null | undefined)) return { error: "Teachers only" };

  const title = input.title.trim();
  if (!title) return { error: "Title required" };

  const turns = input.turns
    .map(normalizeTurn)
    .filter((t): t is CustomDialogTurn => t !== null);
  if (turns.length < 2) return { error: "Need at least two turns" };
  const userTurns = turns.filter((t) => t.speaker === "user").length;
  if (userTurns < 1) return { error: "Need at least one user turn to evaluate" };

  const payload = {
    teacher_id: user.id,
    title,
    character_name: input.character?.trim() || null,
    band: input.band?.trim() || null,
    pt_summary: input.pt_summary?.trim() || null,
    turns,
    is_public: input.is_public,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await admin
      .from("custom_speaking_dialogs")
      .update(payload)
      .eq("id", input.id)
      .eq("teacher_id", user.id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: error?.message ?? "Update failed" };
    return { id: data.id as string };
  }

  const { data, error } = await admin
    .from("custom_speaking_dialogs")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };
  return { id: data.id as string };
}

export async function deleteCustomDialog(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("custom_speaking_dialogs")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) return { error: error.message };
  return { success: true as const };
}

function mapRow(row: Record<string, unknown>): CustomDialog {
  const rawTurns = Array.isArray(row.turns) ? (row.turns as unknown[]) : [];
  const turns = rawTurns
    .map(normalizeTurn)
    .filter((t): t is CustomDialogTurn => t !== null);
  return {
    id: row.id as string,
    teacher_id: row.teacher_id as string,
    title: (row.title as string) ?? "",
    character: (row.character_name as string | null) ?? null,
    band: (row.band as string | null) ?? null,
    pt_summary: (row.pt_summary as string | null) ?? null,
    turns,
    is_public: Boolean(row.is_public),
    updated_at: (row.updated_at as string) ?? "",
  };
}

export async function listMyCustomDialogs(): Promise<CustomDialog[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  // Defensive: survive the table not existing yet (pre-migration 022 build).
  try {
    const { data, error } = await admin
      .from("custom_speaking_dialogs")
      .select(
        "id, teacher_id, title, character_name, band, pt_summary, turns, is_public, updated_at",
      )
      .eq("teacher_id", user.id)
      .order("updated_at", { ascending: false });
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map(mapRow);
  } catch {
    return [];
  }
}

/**
 * Dialogs available to the current user inside the Speaking Lab:
 *   - teachers: their own dialogs (both private and public)
 *   - students: public dialogs from teachers of classrooms they belong to
 */
export async function listAvailableCustomDialogs(): Promise<CustomDialog[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (isTeacherRole(profile?.role as string | null | undefined)) {
    return listMyCustomDialogs();
  }

  // Student: find teachers whose classrooms they belong to.
  const { data: memberships } = await admin
    .from("classroom_members")
    .select("classroom_id")
    .eq("student_id", user.id);
  const classroomIds = (memberships ?? []).map((m) => m.classroom_id as string);
  if (classroomIds.length === 0) return [];

  const { data: classrooms } = await admin
    .from("classrooms")
    .select("teacher_id")
    .in("id", classroomIds);
  const teacherIds = Array.from(
    new Set((classrooms ?? []).map((c) => c.teacher_id as string)),
  );
  if (teacherIds.length === 0) return [];

  try {
    const { data, error } = await admin
      .from("custom_speaking_dialogs")
      .select(
        "id, teacher_id, title, character_name, band, pt_summary, turns, is_public, updated_at",
      )
      .in("teacher_id", teacherIds)
      .eq("is_public", true)
      .order("updated_at", { ascending: false });
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map(mapRow);
  } catch {
    return [];
  }
}