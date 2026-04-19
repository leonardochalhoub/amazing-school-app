/* eslint-disable no-console */
/**
 * Seed demo teacher + 6 demo students with realistic, reproducible data
 * reaching back to January 2024. The landing page "Try teacher view" /
 * "Try student view" buttons sign into these accounts.
 *
 *   npx tsx scripts/seed-demo.ts
 *
 * Needs .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Uses DEMO_ACCOUNT_PASSWORD if set, otherwise a fixed default.
 *
 * Idempotent — reruns update existing demo rows in place.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

(function loadEnv() {
  const envPath = resolve(".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
})();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEMO_PASSWORD =
  process.env.DEMO_ACCOUNT_PASSWORD ?? "demo-explore-amazing-school-2026";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// -------- Personas (ids get resolved at runtime + stashed in demo-ids.json) --------
const TEACHER_SPEC = {
  email: "demo.luiza@amazingschool.app",
  fullName: "Luiza Martins",
  photo:
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
};

type StudentSpec = {
  email: string;
  fullName: string;
  preferred: string;
  ageGroup: "teen" | "adult";
  gender: "female" | "male";
  level: "a1" | "a2" | "b1" | "b2";
  birthday: string;
  classroomIdx: 0 | 1;
  photo: string;
  diligence: number;
  tuitionCents: number;
};

const STUDENT_SPECS: StudentSpec[] = [
  {
    email: "demo.ana@amazingschool.app",
    fullName: "Ana Costa",
    preferred: "Ana",
    ageGroup: "teen",
    gender: "female",
    level: "a2",
    birthday: "2009-03-14",
    classroomIdx: 0,
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    diligence: 0.82,
    tuitionCents: 28000,
  },
  {
    email: "demo.bruno@amazingschool.app",
    fullName: "Bruno Ferreira",
    preferred: "Bruno",
    ageGroup: "adult",
    gender: "male",
    level: "b1",
    birthday: "1996-08-22",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    diligence: 0.55,
    tuitionCents: 32000,
  },
  {
    email: "demo.carla@amazingschool.app",
    fullName: "Carla Santos",
    preferred: "Carla",
    ageGroup: "adult",
    gender: "female",
    level: "b2",
    birthday: "1990-11-02",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    diligence: 0.9,
    tuitionCents: 36000,
  },
  {
    email: "demo.diego@amazingschool.app",
    fullName: "Diego Oliveira",
    preferred: "Di",
    ageGroup: "teen",
    gender: "male",
    level: "a1",
    birthday: "2008-06-30",
    classroomIdx: 0,
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    diligence: 0.45,
    tuitionCents: 28000,
  },
  {
    email: "demo.emily@amazingschool.app",
    fullName: "Emily Pereira",
    preferred: "Em",
    ageGroup: "adult",
    gender: "female",
    level: "b1",
    birthday: "2001-01-18",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    diligence: 0.7,
    tuitionCents: 32000,
  },
  {
    email: "demo.felipe@amazingschool.app",
    fullName: "Felipe Rocha",
    preferred: "Fê",
    ageGroup: "adult",
    gender: "male",
    level: "a2",
    birthday: "1992-09-11",
    classroomIdx: 0,
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    diligence: 0.62,
    tuitionCents: 28000,
  },
];

const CLASSROOMS = [
  {
    name: "A1/A2 Morning Starter",
    description:
      "Beginner to upper-beginner focus: greetings, past simple, everyday routines.",
    inviteCode: "DEMO-AM",
  },
  {
    name: "B1/B2 Evening Flow",
    description:
      "Intermediate conversation club: opinions, storytelling, phrasal verbs.",
    inviteCode: "DEMO-PM",
  },
];

const START_DATE = new Date("2024-01-01T12:00:00Z");
const IDS_FILE = resolve("scripts/demo-ids.json");

type DemoIds = {
  teacher: { id: string; email: string };
  students: { id: string; rosterId: string; email: string }[];
  classroomIds: string[];
};

// -------- Deterministic RNG --------
function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStringToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// -------- Helpers --------
async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function uploadAvatar(userId: string, sourceUrl: string) {
  const raw = await fetchBuffer(sourceUrl);
  const webp = await sharp(raw)
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 86 })
    .toBuffer();
  const { error } = await admin.storage
    .from("avatars")
    .upload(`${userId}.webp`, webp, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
  if (error) throw error;
}

async function findUserByEmail(email: string): Promise<string | null> {
  // listUsers paginates; we page until found. For demo scale (≤7 demo users)
  // the first page is plenty.
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureAuthUser(
  email: string,
  password: string,
  fullName: string,
): Promise<string> {
  const existing = await findUserByEmail(email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing, {
      password,
      user_metadata: { full_name: fullName, demo: true },
      email_confirm: true,
    });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, demo: true },
  });
  if (error) throw error;
  return data.user.id;
}

function loadLessonSlugsByLevel(): Record<string, string[]> {
  const raw = readFileSync(resolve("content/lessons/by-cefr.json"), "utf8");
  return JSON.parse(raw) as Record<string, string[]>;
}
function loadMusicSlugs(): { slug: string; level: string }[] {
  const raw = readFileSync(resolve("content/music/index.json"), "utf8");
  const parsed = JSON.parse(raw) as {
    songs: { slug: string; cefr_level: string }[];
  };
  return parsed.songs.map((s) => ({ slug: s.slug, level: s.cefr_level }));
}

// -------- Main --------
async function main() {
  console.log("⏳ Seeding demo teacher + 6 students …");

  // 1) Auth users
  console.log("  ▸ creating/updating auth users …");
  const teacherId = await ensureAuthUser(
    TEACHER_SPEC.email,
    DEMO_PASSWORD,
    TEACHER_SPEC.fullName,
  );
  const studentIds: string[] = [];
  for (const s of STUDENT_SPECS) {
    const id = await ensureAuthUser(s.email, DEMO_PASSWORD, s.fullName);
    studentIds.push(id);
  }

  // 2) Profiles + avatars (needed before classrooms because of FK)
  for (const p of [
    { id: teacherId, fullName: TEACHER_SPEC.fullName, photo: TEACHER_SPEC.photo, role: "teacher" as const },
    ...STUDENT_SPECS.map((s, i) => ({
      id: studentIds[i],
      fullName: s.fullName,
      photo: s.photo,
      role: "student" as const,
    })),
  ]) {
    console.log(`  ▸ avatar+profile: ${p.fullName}`);
    try {
      await uploadAvatar(p.id, p.photo);
    } catch (e) {
      console.warn(
        `    ! avatar failed for ${p.fullName}: ${(e as Error).message}`,
      );
    }
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: p.id,
        full_name: p.fullName,
        role: p.role,
        avatar_url: `${p.id}.webp`,
      },
      { onConflict: "id" },
    );
    if (profileErr) throw new Error(`profile ${p.fullName}: ${profileErr.message}`);
  }

  // 3) Classrooms — keep stable ids once created; stash them in demo-ids.json
  const previous = existsSync(IDS_FILE)
    ? (JSON.parse(readFileSync(IDS_FILE, "utf8")) as DemoIds)
    : null;

  const classroomIds: string[] = [];
  for (let i = 0; i < CLASSROOMS.length; i++) {
    const c = CLASSROOMS[i];
    let id = previous?.classroomIds?.[i];
    if (!id) {
      const { data: hit } = await admin
        .from("classrooms")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("invite_code", c.inviteCode)
        .maybeSingle();
      id = (hit as { id: string } | null)?.id ?? crypto.randomUUID();
    }
    const { error } = await admin.from("classrooms").upsert(
      {
        id,
        teacher_id: teacherId,
        name: c.name,
        description: c.description,
        invite_code: c.inviteCode,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(`classroom ${c.name}: ${error.message}`);
    classroomIds.push(id);
  }

  // 4) Roster + classroom_members
  const rosterIds: string[] = [];
  for (let i = 0; i < STUDENT_SPECS.length; i++) {
    const s = STUDENT_SPECS[i];
    const studentId = studentIds[i];
    const previousRosterId = previous?.students?.[i]?.rosterId;

    let rosterId: string;
    if (previousRosterId) {
      rosterId = previousRosterId;
      await admin.from("roster_students").upsert(
        {
          id: rosterId,
          teacher_id: teacherId,
          classroom_id: classroomIds[s.classroomIdx],
          full_name: s.fullName,
          preferred_name: s.preferred,
          email: s.email,
          has_avatar: false,
          age_group: s.ageGroup,
          gender: s.gender,
          level: s.level,
          birthday: s.birthday,
          auth_user_id: studentId,
          monthly_tuition_cents: s.tuitionCents,
          billing_day: 10,
          billing_starts_on: "2024-01-10",
        },
        { onConflict: "id" },
      );
    } else {
      // Try to find by (teacher_id, email); else create.
      const { data: hit } = await admin
        .from("roster_students")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("email", s.email)
        .maybeSingle();
      rosterId = (hit as { id: string } | null)?.id ?? crypto.randomUUID();
      await admin.from("roster_students").upsert(
        {
          id: rosterId,
          teacher_id: teacherId,
          classroom_id: classroomIds[s.classroomIdx],
          full_name: s.fullName,
          preferred_name: s.preferred,
          email: s.email,
          has_avatar: false,
          age_group: s.ageGroup,
          gender: s.gender,
          level: s.level,
          birthday: s.birthday,
          auth_user_id: studentId,
          monthly_tuition_cents: s.tuitionCents,
          billing_day: 10,
          billing_starts_on: "2024-01-10",
        },
        { onConflict: "id" },
      );
    }
    rosterIds.push(rosterId);

    await admin.from("classroom_members").upsert(
      {
        classroom_id: classroomIds[s.classroomIdx],
        student_id: studentId,
      },
      { onConflict: "classroom_id,student_id" },
    );
  }

  // 5) Timeline data
  await seedTimeline({ teacherId, studentIds, rosterIds, classroomIds });

  // 6) Stash ids for reuse
  const ids: DemoIds = {
    teacher: { id: teacherId, email: TEACHER_SPEC.email },
    students: STUDENT_SPECS.map((s, i) => ({
      id: studentIds[i],
      rosterId: rosterIds[i],
      email: s.email,
    })),
    classroomIds,
  };
  writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2) + "\n");
  console.log(`✅ Saved ids to ${IDS_FILE}`);
  console.log(`   Teacher login: ${TEACHER_SPEC.email}  /  ${DEMO_PASSWORD}`);
  console.log(
    `   Sample student: ${STUDENT_SPECS[0].email}  /  ${DEMO_PASSWORD}`,
  );
}

type TimelineArgs = {
  teacherId: string;
  studentIds: string[];
  rosterIds: string[];
  classroomIds: string[];
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

async function seedTimeline(args: TimelineArgs) {
  const { teacherId, studentIds, rosterIds, classroomIds } = args;
  const now = new Date();
  const totalDays = daysBetween(START_DATE, now);
  console.log(
    `  ▸ generating ${totalDays}+ days of history for 6 students …`,
  );

  const lessonsByLevel = loadLessonSlugsByLevel();
  const allMusic = loadMusicSlugs();

  type Row = Record<string, unknown>;
  const activityRows: Row[] = [];
  const xpRows: Row[] = [];
  const progressRows: Row[] = [];
  const assignmentRows: Row[] = [];
  const conversationRows: Row[] = [];
  const messageRows: Row[] = [];
  const badgeRows: Row[] = [];
  const paymentRows: Row[] = [];

  // 5a) classroom-wide assignments — one every ~10 days per classroom
  for (let ci = 0; ci < classroomIds.length; ci++) {
    const classroomId = classroomIds[ci];
    const roster = STUDENT_SPECS.filter((s) => s.classroomIdx === ci);
    const levelKey = (roster[0]?.level ?? "a1") as string;
    const pool = (lessonsByLevel[`${levelKey}.1`] ?? []).concat(
      lessonsByLevel[`${levelKey}.2`] ?? [],
    );
    if (pool.length === 0) continue;
    const rng = mulberry32(hashStringToSeed(`cw:${classroomId}`));
    const used = new Set<string>();
    for (let d = 0; d < totalDays; d += 8 + Math.floor(rng() * 4)) {
      const available = pool.filter((s) => !used.has(s));
      if (available.length === 0) break; // classroom-wide slug must be unique
      const pick = available[Math.floor(rng() * available.length)];
      used.add(pick);
      const when = addDays(START_DATE, d);
      assignmentRows.push({
        id: crypto.randomUUID(),
        classroom_id: classroomId,
        lesson_slug: pick,
        assigned_by: teacherId,
        assigned_at: when.toISOString(),
        due_date: addDays(when, 14).toISOString().slice(0, 10),
        student_id: null,
        roster_student_id: null,
        order_index: 0,
        status: "assigned",
      });
    }
  }

  // 5b) Per-student timeline
  for (let i = 0; i < STUDENT_SPECS.length; i++) {
    const s = STUDENT_SPECS[i];
    const studentId = studentIds[i];
    const rosterId = rosterIds[i];
    const classroomId = classroomIds[s.classroomIdx];
    const rng = mulberry32(hashStringToSeed(`${studentId}:${s.email}`));

    // Targeted assignments (music + per-student lessons)
    const levelPool = (lessonsByLevel[`${s.level}.1`] ?? []).concat(
      lessonsByLevel[`${s.level}.2`] ?? [],
    );
    const musicPool = allMusic
      .filter((m) => m.level.startsWith(s.level))
      .map((m) => `music:${m.slug}`);
    const targetedPool = [...levelPool, ...musicPool];
    const used = new Set<string>();
    for (let d = 14; d < totalDays; d += 18 + Math.floor(rng() * 10)) {
      const available = targetedPool.filter((x) => !used.has(x));
      if (available.length === 0) break; // per-roster slug must be unique
      const pick = available[Math.floor(rng() * available.length)];
      used.add(pick);
      const when = addDays(START_DATE, d);
      assignmentRows.push({
        id: crypto.randomUUID(),
        classroom_id: classroomId,
        lesson_slug: pick,
        assigned_by: teacherId,
        assigned_at: when.toISOString(),
        due_date: null,
        student_id: null,
        roster_student_id: rosterId,
        order_index: 0,
        status: "assigned",
      });
    }

    // Daily activity + XP + completions
    const completedSlugs = new Set<string>();
    for (let d = 0; d < totalDays; d++) {
      const day = addDays(START_DATE, d);
      const dow = day.getUTCDay();
      const weekendBias = dow === 0 || dow === 6 ? 0.55 : 1.1;
      if (rng() > s.diligence * weekendBias) continue;
      const lessonsDone = rng() < 0.25 ? 2 : 1;
      const chatMsgs = rng() < 0.4 ? 3 + Math.floor(rng() * 6) : 0;
      activityRows.push({
        student_id: studentId,
        activity_date: isoDate(day),
        lesson_count: lessonsDone,
        chat_messages: chatMsgs,
      });
      for (let k = 0; k < lessonsDone; k++) {
        xpRows.push({
          id: crypto.randomUUID(),
          student_id: studentId,
          classroom_id: classroomId,
          xp_amount: 20 + Math.floor(rng() * 30),
          source: "lesson",
          source_id: null,
          created_at: new Date(
            day.getTime() + (10 + rng() * 8) * 3600_000,
          ).toISOString(),
        });
      }
      if (rng() < 0.15) {
        xpRows.push({
          id: crypto.randomUUID(),
          student_id: studentId,
          classroom_id: classroomId,
          xp_amount: 10,
          source: "streak_bonus",
          source_id: null,
          created_at: day.toISOString(),
        });
      }
      if (rng() < 0.35 && levelPool.length > 0) {
        const slug = levelPool[Math.floor(rng() * levelPool.length)];
        if (!completedSlugs.has(slug)) {
          completedSlugs.add(slug);
          const started = new Date(day.getTime() + 9 * 3600_000);
          const completed = new Date(started.getTime() + 25 * 60_000);
          progressRows.push({
            id: crypto.randomUUID(),
            student_id: studentId,
            lesson_slug: slug,
            classroom_id: classroomId,
            completed_exercises: 4,
            total_exercises: 4,
            started_at: started.toISOString(),
            completed_at: completed.toISOString(),
          });
        }
      }
    }

    // Conversations every ~14 days
    for (let d = 6; d < totalDays; d += 12 + Math.floor(rng() * 10)) {
      const convId = crypto.randomUUID();
      const start = addDays(START_DATE, d);
      conversationRows.push({
        id: convId,
        student_id: studentId,
        classroom_id: classroomId,
        created_at: start.toISOString(),
      });
      const turns = 4 + Math.floor(rng() * 5);
      for (let t = 0; t < turns; t++) {
        const when = new Date(start.getTime() + t * 90_000);
        const isUser = t % 2 === 0;
        messageRows.push({
          id: crypto.randomUUID(),
          conversation_id: convId,
          role: isUser ? "user" : "assistant",
          content: isUser
            ? pickStudentLine(rng, s.level)
            : pickTutorLine(rng, s.level),
          created_at: when.toISOString(),
        });
      }
    }

    // Badges
    badgeRows.push({
      id: crypto.randomUUID(),
      student_id: studentId,
      badge_type: "first_lesson",
      earned_at: addDays(START_DATE, 2).toISOString(),
    });
    if (s.diligence > 0.7) {
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "week_streak",
        earned_at: addDays(START_DATE, 14).toISOString(),
      });
    }

    // Monthly payments
    const cursor = new Date("2024-01-10T12:00:00Z");
    while (cursor <= now) {
      const isPaid = rng() < 0.92;
      paymentRows.push({
        id: crypto.randomUUID(),
        roster_student_id: rosterId,
        teacher_id: teacherId,
        billing_month: isoDate(
          new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1)),
        ),
        amount_cents: s.tuitionCents,
        currency: "BRL",
        paid: isPaid,
        paid_at: isPaid
          ? new Date(
              cursor.getTime() + Math.floor(rng() * 5 * 86_400_000),
            ).toISOString()
          : null,
        notes: null,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  console.log(
    `    rows — activity:${activityRows.length} xp:${xpRows.length} progress:${progressRows.length} assignments:${assignmentRows.length} conv:${conversationRows.length} msg:${messageRows.length} payments:${paymentRows.length}`,
  );

  await clearPrior(studentIds, rosterIds, classroomIds);
  await bulkInsert("daily_activity", activityRows, 500);
  await bulkInsert("xp_events", xpRows, 500);
  await bulkInsert("lesson_progress", progressRows, 500);
  await bulkInsert("lesson_assignments", assignmentRows, 500);
  await bulkInsert("conversations", conversationRows, 500);
  await bulkInsert("messages", messageRows, 500);
  await bulkInsert("badges", badgeRows, 200);
  await bulkInsert("student_payments", paymentRows, 300);
}

async function clearPrior(
  studentIds: string[],
  rosterIds: string[],
  classroomIds: string[],
) {
  const convs = await admin
    .from("conversations")
    .select("id")
    .in("student_id", studentIds);
  const convIds = (convs.data ?? []).map((r) => (r as { id: string }).id);
  if (convIds.length > 0) {
    await admin.from("messages").delete().in("conversation_id", convIds);
  }
  await admin.from("conversations").delete().in("student_id", studentIds);
  await admin.from("badges").delete().in("student_id", studentIds);
  await admin.from("daily_activity").delete().in("student_id", studentIds);
  await admin.from("xp_events").delete().in("student_id", studentIds);
  await admin.from("lesson_progress").delete().in("student_id", studentIds);
  await admin
    .from("lesson_assignments")
    .delete()
    .in("classroom_id", classroomIds);
  await admin
    .from("student_payments")
    .delete()
    .in("roster_student_id", rosterIds);
}

async function bulkInsert(
  table: string,
  rows: Record<string, unknown>[],
  chunk: number,
) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await admin.from(table).insert(slice);
    if (error) {
      throw new Error(
        `insert ${table} chunk ${i}-${i + slice.length}: ${error.message}`,
      );
    }
  }
}

const STUDENT_LINES = {
  a1: [
    "Hi! Today I learn greetings.",
    "I try past simple: I go to store yesterday.",
    "Teacher, how do I say 'almoço' in English?",
    "Can you help with pronunciation of 'th'?",
  ],
  a2: [
    "I'm practicing adjectives. She is kind and clever.",
    "I want to describe my last vacation in English.",
    "Is 'used to' for past habits? I used to play soccer.",
    "Can you correct this? I am finished my homework.",
  ],
  b1: [
    "Could you suggest two connectors besides 'however'?",
    "I'm summarizing an article about climate change.",
    "How do you say 'dar um jeitinho' naturally in English?",
    "I'm preparing a presentation — any opening lines?",
  ],
  b2: [
    "What's a good synonym for 'drastically' in a formal essay?",
    "I need feedback on this paragraph about remote work.",
    "Can you quiz me on phrasal verbs with 'get'?",
    "I'm unsure about the difference between 'anxious' and 'eager'.",
  ],
};

const TUTOR_LINES = {
  a1: [
    "Great! Say 'Good morning! How are you?'",
    "Almost — 'I went to the store yesterday'. 'went' is past of 'go'.",
    "'Almoço' is 'lunch'. Repeat: lunch.",
    "Put your tongue between your teeth and blow air: 'think'.",
  ],
  a2: [
    "Nice! Try: 'She is kind and very clever.'",
    "Tell me: where did you go? what did you eat?",
    "Yes — 'I used to play soccer every Sunday.' Perfect.",
    "Use 'I have finished'. 'finished' is the past participle.",
  ],
  b1: [
    "Try 'nevertheless' (formal) or 'even so' (casual).",
    "Good. Start with 'The article argues that…' then paraphrase.",
    "Closest is 'to find a way' or 'to work around it'.",
    "Open with a rhetorical question or a surprising stat.",
  ],
  b2: [
    "Try 'precipitously' or 'markedly' for formal writing.",
    "Happy to! Paste the paragraph and I'll flag collocations.",
    "Sure — get over, get on with, get at, get across, get away with…",
    "'Anxious' = worried, 'eager' = excited to. Context matters.",
  ],
};

function pickStudentLine(rng: () => number, level: string): string {
  const pool =
    STUDENT_LINES[level as keyof typeof STUDENT_LINES] ?? STUDENT_LINES.a2;
  return pool[Math.floor(rng() * pool.length)];
}
function pickTutorLine(rng: () => number, level: string): string {
  const pool = TUTOR_LINES[level as keyof typeof TUTOR_LINES] ?? TUTOR_LINES.a2;
  return pool[Math.floor(rng() * pool.length)];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
