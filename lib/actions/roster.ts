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
  endedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal("")),
  billingStartsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .or(z.literal("")),
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
  if (parsed.data.endedOn !== undefined)
    patch.ended_on = parsed.data.endedOn || null;
  if (parsed.data.billingStartsOn !== undefined)
    patch.billing_starts_on = parsed.data.billingStartsOn || null;

  const { error } = await supabase
    .from("roster_students")
    .update(patch)
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath(`/teacher/students/${parsed.data.id}`);
  return { success: true as const };
}

const DeleteSchema = z.object({ id: UuidSchema });

export interface DeletedRosterRow {
  id: string;
  full_name: string;
  email: string | null;
  classroom_name: string | null;
  deleted_at: string;
  monthly_tuition_cents: number | null;
}

/**
 * List every roster row the current teacher soft-deleted, with
 * enough metadata to decide whether to restore or leave alone.
 * Ordered by most-recently deleted first.
 */
export async function listDeletedRosterStudents(): Promise<DeletedRosterRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  // Defensive: if migration 041 hasn't been applied yet the
  // deleted_at column doesn't exist and every query here would
  // 500. Swallow that specific shape of error and return an empty
  // archive so the card still renders with its "no deleted
  // students yet" empty state.
  const { data, error } = await admin
    .from("roster_students")
    .select(
      "id, full_name, email, classroom_id, deleted_at, monthly_tuition_cents, classrooms(name)",
    )
    .eq("teacher_id", user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) {
    console.warn(
      "[listDeletedRosterStudents] query failed (migration 041?)",
      error.message,
    );
    return [];
  }

  return ((data ?? []) as Array<{
    id: string;
    full_name: string;
    email: string | null;
    classroom_id: string | null;
    deleted_at: string;
    monthly_tuition_cents: number | null;
    classrooms: { name: string } | { name: string }[] | null;
  }>).map((r) => {
    const classroom = Array.isArray(r.classrooms)
      ? r.classrooms[0]
      : r.classrooms;
    return {
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      classroom_name: classroom?.name ?? null,
      deleted_at: r.deleted_at,
      monthly_tuition_cents: r.monthly_tuition_cents,
    };
  });
}

/**
 * Bring a soft-deleted roster row back to life. Clears deleted_at
 * and revalidates every active-roster surface. Fails cleanly if the
 * caller doesn't own the row or if the row isn't actually deleted.
 */
export async function reactivateRosterStudent(
  input: z.input<typeof DeleteSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: own } = await admin
    .from("roster_students")
    .select("id, teacher_id, deleted_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!own) return { error: "Student not found" };
  const row = own as {
    id: string;
    teacher_id: string;
    deleted_at: string | null;
  };
  if (row.teacher_id !== user.id) return { error: "Not yours" };
  if (!row.deleted_at) return { error: "Student isn't deleted" };

  const { error } = await admin
    .from("roster_students")
    .update({ deleted_at: null })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/admin");
  revalidatePath(`/teacher/students/${parsed.data.id}`);
  revalidatePath("/owner/sysadmin");
  return { success: true };
}

export async function deleteRosterStudent(input: z.input<typeof DeleteSchema>) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Soft-delete (migration 041). Stamp deleted_at instead of
  // removing the row — all historical joins on this student
  // (assignments, XP, lesson completions, AI chats, diary,
  // class log, payments) keep resolving the name because the
  // row lives on. Active-roster queries filter `deleted_at
  // IS NULL` so the student vanishes from the teacher's UI.
  //
  // Only the teacher who owns the roster can delete it.
  const { data: own } = await supabase
    .from("roster_students")
    .select("id, teacher_id, deleted_at")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!own) return { error: "Student not found" };
  const row = own as {
    id: string;
    teacher_id: string;
    deleted_at: string | null;
  };
  if (row.teacher_id !== user.id) return { error: "Not yours to delete" };
  if (row.deleted_at) return { error: "Student is already deleted" };

  const { error, count } = await supabase
    .from("roster_students")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", parsed.data.id)
    .is("deleted_at", null);

  if (error) return { error: error.message };
  if (!count)
    return { error: "Delete didn't take effect. Try reloading the page." };

  revalidatePath("/teacher");
  revalidatePath("/teacher/admin");
  revalidatePath(`/teacher/students/${parsed.data.id}`);
  revalidatePath("/owner/sysadmin");
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
    .is("deleted_at", null)
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

const AddToClassroomSchema = z.object({
  classroomId: UuidSchema,
  rosterStudentIds: z.array(UuidSchema).min(1).max(200),
});

export interface AvailableRosterStudent {
  id: string;
  full_name: string;
  email: string | null;
  current_classroom_name: string | null;
  has_avatar: boolean;
}

/**
 * For the "Add students" dialog on a classroom page. Lists every
 * active roster student owned by the caller, excluding those
 * already placed in the given classroom. Includes the student's
 * current classroom name when applicable so the teacher knows
 * they're MOVING the student rather than creating a duplicate.
 */
export async function listRosterStudentsAvailableForClassroom(
  classroomId: string,
): Promise<AvailableRosterStudent[]> {
  if (!UuidSchema.safeParse(classroomId).success) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("roster_students")
    .select(
      "id, full_name, email, classroom_id, has_avatar, classrooms(name)",
    )
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  type Row = {
    id: string;
    full_name: string;
    email: string | null;
    classroom_id: string | null;
    has_avatar: boolean;
    classrooms: { name: string } | { name: string }[] | null;
  };
  return ((data ?? []) as Row[])
    .filter((r) => r.classroom_id !== classroomId)
    .map((r) => {
      const c = Array.isArray(r.classrooms) ? r.classrooms[0] : r.classrooms;
      return {
        id: r.id,
        full_name: r.full_name,
        email: r.email,
        current_classroom_name: c?.name ?? null,
        has_avatar: r.has_avatar,
      };
    });
}

/**
 * Move one or more roster students into a classroom. Validates
 * ownership on every row: the classroom and every student must
 * belong to the caller. Sets roster_students.classroom_id — if a
 * student was in another classroom of the same teacher they move,
 * no history is lost because all child rows (assignments, XP,
 * history, payments) are keyed by student_id / roster_student_id,
 * not by classroom.
 */
export async function addRosterStudentsToClassroom(
  input: z.input<typeof AddToClassroomSchema>,
): Promise<{ moved: number } | { error: string }> {
  const parsed = AddToClassroomSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();

  const { data: classroom } = await admin
    .from("classrooms")
    .select("id, teacher_id, deleted_at")
    .eq("id", parsed.data.classroomId)
    .maybeSingle();
  const c = classroom as {
    id: string;
    teacher_id: string;
    deleted_at: string | null;
  } | null;
  if (!c) return { error: "Classroom not found" };
  if (c.teacher_id !== user.id) return { error: "Not your classroom" };
  if (c.deleted_at) return { error: "Classroom is deleted" };

  const { data: owned } = await admin
    .from("roster_students")
    .select("id")
    .in("id", parsed.data.rosterStudentIds)
    .eq("teacher_id", user.id)
    .is("deleted_at", null);
  const ownedIds = ((owned ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ownedIds.length === 0) {
    return { error: "No valid students selected" };
  }

  const { error } = await admin
    .from("roster_students")
    .update({ classroom_id: parsed.data.classroomId })
    .in("id", ownedIds);
  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/admin");
  revalidatePath(`/teacher/classroom/${parsed.data.classroomId}`);
  return { moved: ownedIds.length };
}
