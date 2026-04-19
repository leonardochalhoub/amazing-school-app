"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import sharp from "sharp";
import type { RosterStudent } from "@/lib/supabase/types";

const UuidSchema = z.string().uuid();

const AgeGroupSchema = z.enum(["kid", "teen", "adult"]);
const GenderSchema = z.enum(["female", "male"]);
const LevelSchema = z.enum(["a1", "a2", "b1", "b2", "c1", "c2", "y4"]);

const BirthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(""));

const CreateSchema = z.object({
  fullName: z.string().min(1).max(120),
  preferredName: z.string().max(60).optional(),
  email: z.string().email().optional().or(z.literal("")),
  classroomId: UuidSchema.nullable().optional(),
  notes: z.string().max(2000).optional(),
  ageGroup: AgeGroupSchema.optional(),
  gender: GenderSchema.optional(),
  birthday: BirthdaySchema,
  level: LevelSchema.optional(),
});

export async function createRosterStudent(input: z.input<typeof CreateSchema>) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("roster_students")
    .insert({
      teacher_id: user.id,
      full_name: parsed.data.fullName,
      preferred_name: parsed.data.preferredName || null,
      email: parsed.data.email || null,
      classroom_id: parsed.data.classroomId ?? null,
      notes: parsed.data.notes ?? null,
      age_group: parsed.data.ageGroup ?? null,
      gender: parsed.data.gender ?? null,
      birthday: parsed.data.birthday || null,
      level: parsed.data.level ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/teacher");
  return { success: true as const, id: data.id as string };
}

const UpdateSchema = z.object({
  id: UuidSchema,
  fullName: z.string().min(1).max(120).optional(),
  preferredName: z.string().max(60).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  classroomId: UuidSchema.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  ageGroup: AgeGroupSchema.nullable().optional(),
  gender: GenderSchema.nullable().optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal("")),
  level: LevelSchema.nullable().optional(),
});

export async function updateRosterStudent(input: z.input<typeof UpdateSchema>) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const patch: Partial<RosterStudent> = { updated_at: new Date().toISOString() };
  if (parsed.data.fullName !== undefined) patch.full_name = parsed.data.fullName;
  if (parsed.data.preferredName !== undefined)
    patch.preferred_name = parsed.data.preferredName || null;
  if (parsed.data.email !== undefined) patch.email = parsed.data.email || null;
  if (parsed.data.classroomId !== undefined) patch.classroom_id = parsed.data.classroomId;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;
  if (parsed.data.ageGroup !== undefined) patch.age_group = parsed.data.ageGroup;
  if (parsed.data.gender !== undefined) patch.gender = parsed.data.gender;
  if (parsed.data.birthday !== undefined)
    patch.birthday = parsed.data.birthday || null;
  if (parsed.data.level !== undefined) patch.level = parsed.data.level;

  const { error } = await supabase
    .from("roster_students")
    .update(patch)
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath(`/teacher/students/${parsed.data.id}`);
  return { success: true as const };
}

export interface UnlinkedStudent {
  id: string;
  fullName: string;
  email: string | null;
}

/**
 * Auth users with role=student whose account is NOT currently linked
 * to ANY roster row. Used by the teacher-side "Link existing user"
 * picker on /teacher/students/[id] when a roster row ends up orphaned
 * (signup path skipped claimInvitation, or the teacher created the
 * roster after the student had already signed up).
 */
export async function listUnlinkedStudentUsers(): Promise<UnlinkedStudent[]> {
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
  if (profile?.role !== "teacher") return [];

  // All auth users with role=student.
  const { data: students } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student");
  const studentRows = students as { id: string; full_name: string }[] | null;
  if (!studentRows || studentRows.length === 0) return [];

  // Any of them already linked to a roster row, anywhere?
  const { data: linked } = await admin
    .from("roster_students")
    .select("auth_user_id")
    .not("auth_user_id", "is", null)
    .in(
      "auth_user_id",
      studentRows.map((s) => s.id),
    );
  const linkedIds = new Set(
    ((linked as { auth_user_id: string }[] | null) ?? []).map(
      (r) => r.auth_user_id,
    ),
  );

  const unlinked = studentRows.filter((s) => !linkedIds.has(s.id));
  if (unlinked.length === 0) return [];

  // Attach each unlinked profile's auth email for easier identification.
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map<string, string | null>();
  for (const u of authUsers?.users ?? []) {
    emailById.set(u.id, u.email ?? null);
  }

  return unlinked.map((s) => ({
    id: s.id,
    fullName: s.full_name,
    email: emailById.get(s.id) ?? null,
  }));
}

const LinkSchema = z.object({
  rosterId: UuidSchema,
  authUserId: UuidSchema,
});

/**
 * Teacher-side: connect a roster row to an existing auth user. Gated
 * on both rows belonging to the caller's scope and the roster not
 * already being linked.
 */
export async function linkRosterToAuthUser(
  input: z.input<typeof LinkSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = LinkSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

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
  if (profile?.role !== "teacher") return { error: "Teachers only" };

  // Confirm the roster belongs to this teacher and is currently unlinked.
  const { data: rosterRow } = await admin
    .from("roster_students")
    .select("id, teacher_id, auth_user_id, email")
    .eq("id", parsed.data.rosterId)
    .maybeSingle();
  if (!rosterRow) return { error: "Student not found" };
  const r = rosterRow as {
    id: string;
    teacher_id: string;
    auth_user_id: string | null;
    email: string | null;
  };
  if (r.teacher_id !== user.id) return { error: "Not your student" };
  if (r.auth_user_id && r.auth_user_id !== parsed.data.authUserId) {
    return {
      error: "This student is already linked to a different account.",
    };
  }

  // Confirm the target auth user is a student and not already linked to
  // another roster row.
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.authUserId)
    .maybeSingle();
  if ((target as { role?: string } | null)?.role !== "student") {
    return { error: "That account is not a student account." };
  }
  const { data: otherLink } = await admin
    .from("roster_students")
    .select("id")
    .eq("auth_user_id", parsed.data.authUserId)
    .neq("id", parsed.data.rosterId)
    .maybeSingle();
  if (otherLink) {
    return { error: "That account is already linked to another roster row." };
  }

  // Copy the auth user's email onto the roster so future signups match
  // by email without manual intervention.
  const { data: authUser } = await admin.auth.admin.getUserById(
    parsed.data.authUserId,
  );
  const authEmail = authUser?.user?.email ?? null;

  const { error: updErr } = await admin
    .from("roster_students")
    .update({
      auth_user_id: parsed.data.authUserId,
      email: r.email ?? authEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.rosterId);
  if (updErr) return { error: updErr.message };

  revalidatePath(`/teacher/students/${parsed.data.rosterId}`);
  revalidatePath("/teacher");
  return { success: true as const };
}

const DeleteSchema = z.object({ id: UuidSchema });

export async function deleteRosterStudent(input: z.input<typeof DeleteSchema>) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await supabase.storage.from("avatars").remove([`roster/${parsed.data.id}.webp`]);

  const { error } = await supabase
    .from("roster_students")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/teacher");
  return { success: true as const };
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED)[number];

export async function uploadRosterAvatar(rosterId: string, formData: FormData) {
  if (!UuidSchema.safeParse(rosterId).success) return { error: "Invalid id" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file" };
  if (file.size === 0) return { error: "Empty file" };
  if (file.size > MAX_BYTES) return { error: "File too large (max 5 MB)" };
  if (!ALLOWED.includes(file.type as AllowedMime)) {
    return { error: "Unsupported image type (JPEG, PNG, or WebP)" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: row } = await supabase
    .from("roster_students")
    .select("id")
    .eq("id", rosterId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!row) return { error: "Student not found" };

  const buf = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  try {
    webp = await sharp(buf)
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "Image processing failed" };
  }

  const path = `roster/${rosterId}.webp`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, webp, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
  if (upErr) return { error: upErr.message };

  await supabase
    .from("roster_students")
    .update({ has_avatar: true, updated_at: new Date().toISOString() })
    .eq("id", rosterId);

  revalidatePath("/teacher");
  revalidatePath(`/teacher/students/${rosterId}`);
  return { success: true as const };
}

export async function removeRosterAvatar(rosterId: string) {
  if (!UuidSchema.safeParse(rosterId).success) return { error: "Invalid id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: row } = await supabase
    .from("roster_students")
    .select("id")
    .eq("id", rosterId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!row) return { error: "Student not found" };

  await supabase.storage.from("avatars").remove([`roster/${rosterId}.webp`]);
  await supabase
    .from("roster_students")
    .update({ has_avatar: false, updated_at: new Date().toISOString() })
    .eq("id", rosterId);

  revalidatePath("/teacher");
  revalidatePath(`/teacher/students/${rosterId}`);
  return { success: true as const };
}

export async function listRoster(): Promise<RosterStudent[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("roster_students")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return (data as RosterStudent[] | null) ?? [];
}

export async function getRosterStudent(id: string): Promise<RosterStudent | null> {
  if (!UuidSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("roster_students")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  return (data as RosterStudent | null) ?? null;
}

export async function getRosterAvatarSignedUrl(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Allow both the teacher who owns the roster AND the student whose auth
  // user is linked to it (so invited students see their own photo on
  // /student without needing a separate profile upload).
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("roster_students")
    .select("id, teacher_id, auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  const r = row as {
    id: string;
    teacher_id: string;
    auth_user_id: string | null;
  };
  if (r.teacher_id !== user.id && r.auth_user_id !== user.id) return null;

  const { data, error } = await admin.storage
    .from("avatars")
    .createSignedUrl(`roster/${id}.webp`, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function getRosterAvatarSignedUrls(
  ids: string[]
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  // Use admin client to sign URLs — we've already scoped `ids` to this teacher
  // upstream (getTeacherOverview queries roster_students.teacher_id = user.id).
  const admin = createAdminClient();
  const results = await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.storage
        .from("avatars")
        .createSignedUrl(`roster/${id}.webp`, 3600);
      return [id, data?.signedUrl ?? null] as const;
    })
  );
  const out: Record<string, string> = {};
  for (const [id, url] of results) if (url) out[id] = url;
  return out;
}
