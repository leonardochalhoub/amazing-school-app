"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner, isTeacherRole } from "@/lib/auth/roles";
import type {
  LessonBankEntryRow,
  LessonBankEntryWithAuthor,
  LessonBankMigrationRow,
  LessonBankVersionRow,
} from "@/lib/actions/lesson-bank-types";
import type { ExerciseBlock } from "@/lib/actions/teacher-lessons-types";

// ─────────────────────────────────────────────────────────────────────────────
// Shape helpers
// ─────────────────────────────────────────────────────────────────────────────

interface TeacherLessonLike {
  id: string;
  teacher_id: string;
  slug: string;
  title: string;
  description: string | null;
  cefr_level: string | null;
  category: string | null;
  skills: string[] | null;
  estimated_minutes: number | null;
  xp_award: number | null;
  exercises: ExerciseBlock[];
}

// Constraint from migration 068 requires skills[] ≥ 1 on teacher_lessons and
// we enforce the same in the share/migrate paths so old bank entries with
// `skills = '{}'` (the default before the column was wired up) still produce
// valid children.
function fallbackSkills(
  skills: string[] | null | undefined,
  category: string | null | undefined,
): string[] {
  if (skills && skills.length > 0) return skills;
  if (category && category.trim()) return [category];
  return ["grammar"];
}

// ─────────────────────────────────────────────────────────────────────────────
// Share / re-publish / unshare
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Publish a teacher_lesson into the lesson bank. If an entry already
 * exists for this (author, slug) we create a new version and update
 * the head snapshot; otherwise we insert version 1.
 *
 * When `changeNote` is provided it's stored on the version row so
 * migrating teachers can see what changed.
 */
export async function shareLessonToBank(input: {
  teacher_lesson_id: string;
  change_note?: string;
}): Promise<
  | { success: true; entry: LessonBankEntryRow; version: LessonBankVersionRow }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();

  const { data: lesson } = await admin
    .from("teacher_lessons")
    .select(
      "id, teacher_id, slug, title, description, cefr_level, category, skills, estimated_minutes, xp_award, exercises",
    )
    .eq("id", input.teacher_lesson_id)
    .maybeSingle();
  const src = lesson as TeacherLessonLike | null;
  if (!src) return { error: "Lesson not found." };
  if (src.teacher_id !== user.id) {
    return { error: "Only the owner can share this lesson." };
  }

  // Look up existing entry for this (author, slug).
  const { data: existing } = await admin
    .from("lesson_bank_entries")
    .select("*")
    .eq("author_id", user.id)
    .eq("slug", src.slug)
    .maybeSingle();
  const existingEntry = existing as LessonBankEntryRow | null;

  const nextVersion = (existingEntry?.current_version ?? 0) + 1;
  const skills = fallbackSkills(src.skills, src.category);

  const payload = {
    teacher_lesson_id: src.id,
    author_id: user.id,
    title: src.title,
    slug: src.slug,
    description: src.description,
    cefr_level: src.cefr_level,
    category: src.category,
    skills,
    estimated_minutes: src.estimated_minutes ?? 10,
    xp_award: src.xp_award ?? 15,
    exercises: src.exercises ?? [],
    current_version: nextVersion,
  };

  const { data: entry, error: upErr } = existingEntry
    ? await admin
        .from("lesson_bank_entries")
        .update(payload)
        .eq("id", existingEntry.id)
        .select("*")
        .single()
    : await admin
        .from("lesson_bank_entries")
        .insert(payload)
        .select("*")
        .single();

  if (upErr) return { error: upErr.message };
  const entryRow = entry as LessonBankEntryRow;

  const { data: versionRow, error: vErr } = await admin
    .from("lesson_bank_versions")
    .insert({
      bank_entry_id: entryRow.id,
      version_no: nextVersion,
      title: payload.title,
      description: payload.description,
      cefr_level: payload.cefr_level,
      category: payload.category,
      skills: payload.skills,
      estimated_minutes: payload.estimated_minutes,
      xp_award: payload.xp_award,
      exercises: payload.exercises,
      change_note: input.change_note ?? null,
    })
    .select("*")
    .single();
  if (vErr) return { error: vErr.message };

  // Auto-sync: push this new content into every teacher who migrated
  // with auto_sync=true.
  await propagateUpdateToMigrators(entryRow.id, nextVersion);

  revalidatePath("/teacher/bank");
  revalidatePath("/teacher/lessons");
  return {
    success: true,
    entry: entryRow,
    version: versionRow as LessonBankVersionRow,
  };
}

async function propagateUpdateToMigrators(
  bankEntryId: string,
  newVersion: number,
) {
  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("lesson_bank_entries")
    .select("*")
    .eq("id", bankEntryId)
    .maybeSingle();
  if (!entry) return;
  const e = entry as LessonBankEntryRow;

  const { data: migrations } = await admin
    .from("lesson_bank_migrations")
    .select("*")
    .eq("bank_entry_id", bankEntryId)
    .eq("auto_sync", true);
  for (const m of (migrations ?? []) as LessonBankMigrationRow[]) {
    if (!m.local_lesson_id) continue;
    const skills = fallbackSkills(
      (e as LessonBankEntryRow & { skills?: string[] | null }).skills,
      e.category,
    );
    await admin
      .from("teacher_lessons")
      .update({
        title: e.title,
        description: e.description,
        cefr_level: e.cefr_level,
        category: e.category,
        skills,
        estimated_minutes: e.estimated_minutes ?? 10,
        xp_award:
          (e as LessonBankEntryRow & { xp_award?: number | null }).xp_award ??
          15,
        exercises: e.exercises,
      })
      .eq("id", m.local_lesson_id)
      .eq("teacher_id", m.teacher_id);
    await admin
      .from("lesson_bank_migrations")
      .update({ synced_version: newVersion })
      .eq("id", m.id);
  }
}

export async function unshareLessonFromBank(
  entryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("lesson_bank_entries")
    .select("id, author_id")
    .eq("id", entryId)
    .maybeSingle();
  const e = entry as { id: string; author_id: string } | null;
  if (!e) return { error: "Not found." };

  const owner = await isOwner();
  if (e.author_id !== user.id && !owner) {
    return { error: "Only the owner can remove this lesson." };
  }

  // Authors hard-delete; sysadmins soft-delete (see sysadminSoftDeleteBankEntry).
  if (e.author_id === user.id) {
    const { error } = await admin
      .from("lesson_bank_entries")
      .delete()
      .eq("id", entryId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from("lesson_bank_entries")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deleted_reason: "Removed by sysadmin",
      })
      .eq("id", entryId);
    if (error) return { error: error.message };
    await admin.from("sysadmin_audit_log").insert({
      actor_id: user.id,
      action: "soft_delete_bank_entry",
      target_type: "lesson_bank_entry",
      target_id: entryId,
      details: { reason: "sysadmin-unshare" },
    });
  }

  revalidatePath("/teacher/bank");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function listBankEntries(opts?: {
  sort?: "recent" | "popular";
  cefr_level?: string;
  category?: string;
  author_id?: string;
  query?: string;
  limit?: number;
}): Promise<LessonBankEntryWithAuthor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  let q = admin
    .from("lesson_bank_entries")
    .select("*")
    .is("deleted_at", null);

  if (opts?.cefr_level) q = q.eq("cefr_level", opts.cefr_level);
  if (opts?.category) q = q.eq("category", opts.category);
  if (opts?.author_id) q = q.eq("author_id", opts.author_id);

  if (opts?.query && opts.query.trim().length > 0) {
    const pat = `%${opts.query.trim()}%`;
    q = q.or(`title.ilike.${pat},slug.ilike.${pat},description.ilike.${pat}`);
  }

  if (opts?.sort === "popular") {
    q = q
      .order("import_count", { ascending: false })
      .order("updated_at", { ascending: false });
  } else {
    q = q.order("updated_at", { ascending: false });
  }

  q = q.limit(opts?.limit ?? 200);

  const { data } = await q;
  const rows = (data as LessonBankEntryRow[] | null) ?? [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", authorIds.length > 0 ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
  const nameById = new Map<string, string>();
  for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
    nameById.set(p.id, p.full_name ?? "");
  }

  // Email lookup for author attribution — runs via auth.admin so only the
  // service role can see it. We keep it to display "Name (email)" nicely.
  const emailById = new Map<string, string>();
  for (const id of authorIds) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(id);
      const email = u?.user?.email ?? null;
      if (email) emailById.set(id, email);
    } catch {
      /* ignore */
    }
  }

  const { data: myMigrations } = await admin
    .from("lesson_bank_migrations")
    .select("*")
    .eq("teacher_id", user.id);
  const migByEntry = new Map<string, LessonBankMigrationRow>();
  for (const m of (myMigrations ?? []) as LessonBankMigrationRow[]) {
    migByEntry.set(m.bank_entry_id, m);
  }

  return rows.map((r) => ({
    ...r,
    author_name: nameById.get(r.author_id) ?? null,
    author_email: emailById.get(r.author_id) ?? null,
    migration: migByEntry.get(r.id) ?? null,
  }));
}

export async function getBankEntryById(
  id: string,
): Promise<LessonBankEntryWithAuthor | null> {
  const rows = await listBankEntries({ limit: 1 });
  const direct = rows.find((r) => r.id === id);
  if (direct) return direct;
  const admin = createAdminClient();
  const { data } = await admin
    .from("lesson_bank_entries")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  const r = data as LessonBankEntryRow;
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", r.author_id)
    .maybeSingle();
  return {
    ...r,
    author_name: (profile as { full_name: string | null } | null)?.full_name ?? null,
    author_email: null,
    migration: null,
  };
}

export async function getBankEntryVersions(
  entryId: string,
): Promise<LessonBankVersionRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("lesson_bank_versions")
    .select("*")
    .eq("bank_entry_id", entryId)
    .order("version_no", { ascending: false });
  return (data as LessonBankVersionRow[] | null) ?? [];
}

export async function listMyBankEntries(): Promise<LessonBankEntryRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("lesson_bank_entries")
    .select("*")
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  return (data as LessonBankEntryRow[] | null) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Migrate (bring into environment)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy a bank entry into the teacher's own teacher_lessons table and
 * record the migration link. Slug is prefixed with "bank-" so it can't
 * collide with an existing local lesson.
 */
export async function migrateBankEntry(
  entryId: string,
): Promise<{ success: true; local_slug: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole(profile?.role as string | null | undefined)) {
    return { error: "Forbidden" };
  }

  const { data: entry } = await admin
    .from("lesson_bank_entries")
    .select("*")
    .eq("id", entryId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!entry) return { error: "Bank entry not found." };
  const e = entry as LessonBankEntryRow;

  const { data: existing } = await admin
    .from("lesson_bank_migrations")
    .select("*")
    .eq("bank_entry_id", entryId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (existing) {
    return {
      error: "You've already brought this lesson into your environment.",
    };
  }

  let localSlug = `bank-${e.slug}`;
  const { data: collision } = await admin
    .from("teacher_lessons")
    .select("id")
    .eq("teacher_id", user.id)
    .eq("slug", localSlug)
    .maybeSingle();
  if (collision) {
    localSlug = `${localSlug}-${Date.now().toString(36).slice(-5)}`;
  }

  const skills = fallbackSkills(
    (e as LessonBankEntryRow & { skills?: string[] | null }).skills,
    e.category,
  );
  const { data: insertedLesson, error: lessonErr } = await admin
    .from("teacher_lessons")
    .insert({
      teacher_id: user.id,
      slug: localSlug,
      title: e.title,
      description: e.description,
      cefr_level: e.cefr_level,
      category: e.category ?? skills[0],
      skills,
      estimated_minutes: e.estimated_minutes ?? 10,
      xp_award:
        (e as LessonBankEntryRow & { xp_award?: number | null }).xp_award ??
        15,
      exercises: e.exercises,
      published: true,
    })
    .select("id")
    .single();
  if (lessonErr) return { error: lessonErr.message };

  await admin.from("lesson_bank_migrations").insert({
    bank_entry_id: entryId,
    teacher_id: user.id,
    local_lesson_id: (insertedLesson as { id: string }).id,
    synced_version: e.current_version,
    auto_sync: true,
  });

  // Bump import counter for the "most imported" ranking.
  await admin
    .from("lesson_bank_entries")
    .update({ import_count: e.import_count + 1 })
    .eq("id", entryId);

  revalidatePath("/teacher/bank");
  revalidatePath("/teacher/lessons");
  return { success: true, local_slug: localSlug };
}

export async function unmigrateBankEntry(
  entryId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const admin = createAdminClient();

  const { data: mig } = await admin
    .from("lesson_bank_migrations")
    .select("*")
    .eq("bank_entry_id", entryId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!mig) return { error: "Not migrated." };
  const m = mig as LessonBankMigrationRow;
  if (m.local_lesson_id) {
    await admin
      .from("teacher_lessons")
      .delete()
      .eq("id", m.local_lesson_id)
      .eq("teacher_id", user.id);
  }
  await admin.from("lesson_bank_migrations").delete().eq("id", m.id);
  revalidatePath("/teacher/bank");
  revalidatePath("/teacher/lessons");
  return { success: true };
}

export async function recordBankAssignment(
  entryId: string,
): Promise<{ success: true } | { error: string }> {
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("lesson_bank_entries")
    .select("assign_count")
    .eq("id", entryId)
    .maybeSingle();
  if (!current) return { error: "Not found." };
  await admin
    .from("lesson_bank_entries")
    .update({
      assign_count:
        ((current as { assign_count: number }).assign_count ?? 0) + 1,
    })
    .eq("id", entryId);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sysadmin actions
// ─────────────────────────────────────────────────────────────────────────────

export async function sysadminSoftDeleteBankEntry(input: {
  entry_id: string;
  reason?: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const owner = await isOwner();
  if (!owner) return { error: "Forbidden" };
  const admin = createAdminClient();

  const { error } = await admin
    .from("lesson_bank_entries")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      deleted_reason: input.reason ?? null,
    })
    .eq("id", input.entry_id);
  if (error) return { error: error.message };

  await admin.from("sysadmin_audit_log").insert({
    actor_id: user.id,
    action: "soft_delete_bank_entry",
    target_type: "lesson_bank_entry",
    target_id: input.entry_id,
    details: { reason: input.reason ?? null },
  });

  revalidatePath("/teacher/bank");
  return { success: true };
}

/**
 * Sysadmin spread — take N teacher_lessons and publish each one into the
 * bank on behalf of the author. Idempotent (skips any teacher_lesson that
 * already has a spread record in lesson_bank_spreads).
 */
export async function sysadminSpreadLessons(
  teacherLessonIds: string[],
): Promise<{ success: true; inserted: number; skipped: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const owner = await isOwner();
  if (!owner) return { error: "Forbidden" };
  const admin = createAdminClient();

  if (!teacherLessonIds.length) return { success: true, inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const lessonId of teacherLessonIds) {
    const { data: spreadExists } = await admin
      .from("lesson_bank_spreads")
      .select("id")
      .eq("source_lesson_id", lessonId)
      .maybeSingle();
    if (spreadExists) {
      skipped += 1;
      continue;
    }
    const { data: lesson } = await admin
      .from("teacher_lessons")
      .select(
        "id, teacher_id, slug, title, description, cefr_level, category, skills, estimated_minutes, xp_award, exercises",
      )
      .eq("id", lessonId)
      .maybeSingle();
    const src = lesson as TeacherLessonLike | null;
    if (!src) {
      skipped += 1;
      continue;
    }

    // Check if author already has a bank entry for this slug (self-shared already).
    const { data: existing } = await admin
      .from("lesson_bank_entries")
      .select("id, current_version")
      .eq("author_id", src.teacher_id)
      .eq("slug", src.slug)
      .maybeSingle();
    if (existing) {
      await admin.from("lesson_bank_spreads").insert({
        source_lesson_id: lessonId,
        source_teacher_id: src.teacher_id,
        bank_entry_id: (existing as { id: string }).id,
        spread_by: user.id,
      });
      skipped += 1;
      continue;
    }

    const { data: newEntry } = await admin
      .from("lesson_bank_entries")
      .insert({
        teacher_lesson_id: src.id,
        author_id: src.teacher_id,
        title: src.title,
        slug: src.slug,
        description: src.description,
        cefr_level: src.cefr_level,
        category: src.category,
        estimated_minutes: src.estimated_minutes,
        exercises: src.exercises ?? [],
        current_version: 1,
        spread_by: user.id,
      })
      .select("id")
      .single();
    if (!newEntry) {
      skipped += 1;
      continue;
    }
    const entryId = (newEntry as { id: string }).id;

    await admin.from("lesson_bank_versions").insert({
      bank_entry_id: entryId,
      version_no: 1,
      title: src.title,
      description: src.description,
      cefr_level: src.cefr_level,
      category: src.category,
      estimated_minutes: src.estimated_minutes,
      exercises: src.exercises ?? [],
      change_note: "Spread by sysadmin",
    });

    await admin.from("lesson_bank_spreads").insert({
      source_lesson_id: lessonId,
      source_teacher_id: src.teacher_id,
      bank_entry_id: entryId,
      spread_by: user.id,
    });

    await admin.from("sysadmin_audit_log").insert({
      actor_id: user.id,
      action: "spread_lesson",
      target_type: "teacher_lesson",
      target_id: lessonId,
      details: { bank_entry_id: entryId },
    });

    inserted += 1;
  }

  revalidatePath("/teacher/bank");
  revalidatePath("/owner/sysadmin");
  return { success: true, inserted, skipped };
}

/**
 * All personalized (teacher-authored) lessons across the platform,
 * descending by created_at. Used by the sysadmin "spread" picker.
 */
export async function sysadminListAllPersonalizedLessons(): Promise<
  Array<{
    id: string;
    teacher_id: string;
    teacher_name: string | null;
    slug: string;
    title: string;
    cefr_level: string | null;
    category: string | null;
    published: boolean;
    created_at: string;
    already_spread: boolean;
  }>
> {
  const owner = await isOwner();
  if (!owner) return [];
  const admin = createAdminClient();
  const { data: lessons } = await admin
    .from("teacher_lessons")
    .select(
      "id, teacher_id, slug, title, cefr_level, category, published, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (lessons ?? []) as Array<{
    id: string;
    teacher_id: string;
    slug: string;
    title: string;
    cefr_level: string | null;
    category: string | null;
    published: boolean;
    created_at: string;
  }>;

  const teacherIds = Array.from(new Set(rows.map((r) => r.teacher_id)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      teacherIds.length > 0 ? teacherIds : ["00000000-0000-0000-0000-000000000000"],
    );
  const nameById = new Map<string, string>();
  for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
    nameById.set(p.id, p.full_name ?? "");
  }

  const { data: spread } = await admin
    .from("lesson_bank_spreads")
    .select("source_lesson_id");
  const spreadSet = new Set<string>(
    ((spread ?? []) as Array<{ source_lesson_id: string }>).map(
      (s) => s.source_lesson_id,
    ),
  );

  return rows.map((r) => ({
    ...r,
    teacher_name: nameById.get(r.teacher_id) ?? null,
    already_spread: spreadSet.has(r.id),
  }));
}

export async function sysadminListDeletedBankEntries(): Promise<
  LessonBankEntryRow[]
> {
  const owner = await isOwner();
  if (!owner) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("lesson_bank_entries")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(200);
  return (data as LessonBankEntryRow[] | null) ?? [];
}
