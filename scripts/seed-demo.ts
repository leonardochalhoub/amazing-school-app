/* eslint-disable no-console */
/**
 * Seed Luiza Martins (demo teacher) + 13 varied demo students.
 *
 *   npx tsx scripts/seed-demo.ts
 *
 * Idempotent. Safe to rerun — writes to scripts/demo-ids.json and then
 * reuses those ids on every subsequent run.
 *
 * Varied data:
 *   - Ana is the star student (heaviest data, lots of diary entries,
 *     scheduled classes, music assignments, full badge collection).
 *   - One student pays 3× the standard tuition.
 *   - One student is in multi-month debt.
 *   - One student studied ~1.5 years then dropped out.
 *   - Monthly revenue fluctuates with discounts, free months, missed
 *     payments, reschedules.
 *   - Every student has a populated "Your activity" — daily rows go
 *     back to 2024-01-01 or later (their join date).
 *   - Diary, student history, scheduled classes all populated.
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
const DEMO_PASSWORD: string =
  process.env.DEMO_ACCOUNT_PASSWORD ?? "demo-explore-amazing-school-2026";
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

const TEACHER_SPEC = {
  email: "demo.luiza@amazingschool.app",
  fullName: "Luiza Martins",
  photo:
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
};

type Persona = {
  email: string;
  fullName: string;
  preferred: string;
  ageGroup: "teen" | "adult";
  gender: "female" | "male";
  level: "a1" | "a2" | "b1" | "b2" | "c1";
  birthday: string;
  classroomIdx: 0 | 1 | 2;
  photo: string;
  /** Join date for this student (their first day on the platform). */
  joinedAt: string;
  /** If present, student stopped on this date (no activity afterwards). */
  droppedAt?: string;
  /** 0..1 daily-engagement probability. */
  diligence: number;
  /** How much homework they actually finish (0..1). */
  completionRate: number;
  /** Monthly tuition in cents (BRL). */
  tuitionCents: number;
  /** Probability of paying in any given month. */
  payRate: number;
  /** How many recent months to deliberately leave unpaid (debt). */
  debtMonths?: number;
  notes: string;
  /**
   * Current curriculum level the student is working on. All levels
   * below this one in LEVEL_ORDER are treated as complete (assignments
   * + lesson_progress rows emitted chronologically); the current
   * level is partway done; anything above is untouched. This is what
   * drives the "lessons assigned in order A, B, C, Y4" behaviour —
   * every student has a realistic backlog trail showing how they
   * got to where they are today.
   */
  progression:
    | "a1.1" | "a1.2" | "a2.1" | "a2.2"
    | "b1.1" | "b1.2" | "b2.1" | "b2.2"
    | "c1.1" | "c1.2" | "c2.1" | "c2.2"
    | "y4.1" | "y4.2";
};

// Ordered curriculum — students walk through this sequence.
// Matches the keys in content/lessons/by-cefr.json. "y4" sits at
// the top as the school's capstone track.
const LEVEL_ORDER = [
  "a1.1", "a1.2",
  "a2.1", "a2.2",
  "b1.1", "b1.2",
  "b2.1", "b2.2",
  "c1.1", "c1.2",
  "c2.1", "c2.2",
  "y4.1", "y4.2",
] as const;

const STUDENT_SPECS: Persona[] = [
  // 1. Ana — the star student. Joined Jan 2024, never misses a beat.
  {
    email: "demo.ana@amazingschool.app",
    fullName: "Ana Costa",
    preferred: "Ana",
    ageGroup: "teen",
    gender: "female",
    level: "b1",
    birthday: "2009-03-14",
    classroomIdx: 0,
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2023-04-10",
    diligence: 0.92,
    completionRate: 0.95,
    tuitionCents: 32000,
    payRate: 0.99,
    progression: "b1.2",
    notes: "Rockstar — never misses a class, writes diary entries often.",
  },
  // 2. Bruno — pays 3× the standard tuition (one-on-one executive rate).
  {
    email: "demo.bruno@amazingschool.app",
    fullName: "Bruno Ferreira",
    preferred: "Bruno",
    ageGroup: "adult",
    gender: "male",
    level: "b1",
    birthday: "1984-08-22",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2023-07-01",
    diligence: 0.55,
    completionRate: 0.6,
    tuitionCents: 96000, // 3× standard
    payRate: 0.98,
    progression: "b1.1",
    notes: "Executive 1-on-1 — pays premium for flexible scheduling.",
  },
  // 3. Carla — dedicated, classic B2 student.
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
    joinedAt: "2023-05-20",
    diligence: 0.85,
    completionRate: 0.82,
    tuitionCents: 36000,
    payRate: 0.96,
    progression: "b2.1",
    notes: "Reliable — prepping for Cambridge FCE.",
  },
  // 4. Diego — dropped out after ~1.5 years.
  {
    email: "demo.diego@amazingschool.app",
    fullName: "Diego Oliveira",
    preferred: "Di",
    ageGroup: "teen",
    gender: "male",
    level: "a2",
    birthday: "2008-06-30",
    classroomIdx: 0,
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2023-09-10",
    droppedAt: "2025-08-30",
    diligence: 0.55,
    completionRate: 0.5,
    tuitionCents: 28000,
    payRate: 0.88,
    progression: "a2.2",
    notes: "Dropped out mid-2025 after a big schedule change.",
  },
  // 5. Emily — solid intermediate.
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
    joinedAt: "2023-09-04",
    diligence: 0.7,
    completionRate: 0.75,
    tuitionCents: 32000,
    payRate: 0.95,
    progression: "b1.1",
    notes: "University student, studies in bursts before exam weeks.",
  },
  // 6. Felipe — chronic debt case (3 months unpaid).
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
    joinedAt: "2024-01-10",
    diligence: 0.62,
    completionRate: 0.55,
    tuitionCents: 28000,
    payRate: 0.72,
    debtMonths: 3,
    progression: "a2.2",
    notes: "Payments slipping — needs a gentle chase.",
  },
  // 7. Gustavo — started late, fast climber.
  {
    email: "demo.gustavo@amazingschool.app",
    fullName: "Gustavo Lima",
    preferred: "Gu",
    ageGroup: "adult",
    gender: "male",
    level: "b2",
    birthday: "1988-12-05",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2024-10-14",
    diligence: 0.88,
    completionRate: 0.9,
    tuitionCents: 36000,
    payRate: 0.99,
    progression: "b2.2",
    notes: "Tech lead moving to Dublin — goal-driven, burns through lessons.",
  },
  // 8. Helena — seasonal, pauses in December.
  {
    email: "demo.helena@amazingschool.app",
    fullName: "Helena Duarte",
    preferred: "Helê",
    ageGroup: "adult",
    gender: "female",
    level: "b1",
    birthday: "1995-05-20",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2023-06-18",
    diligence: 0.66,
    completionRate: 0.7,
    tuitionCents: 32000,
    payRate: 0.93,
    progression: "b1.2",
    notes: "Takes December off every year — pays 10/12 months.",
  },
  // 9. Isabela — just starting, low level.
  {
    email: "demo.isabela@amazingschool.app",
    fullName: "Isabela Nunes",
    preferred: "Isa",
    ageGroup: "adult",
    gender: "female",
    level: "a1",
    birthday: "1998-07-12",
    classroomIdx: 2,
    photo:
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2025-10-01",
    diligence: 0.6,
    completionRate: 0.55,
    tuitionCents: 26000,
    payRate: 0.95,
    progression: "a1.1",
    notes: "Newcomer, still getting used to the alphabet.",
  },
  // 10. João — teen, very casual.
  {
    email: "demo.joao@amazingschool.app",
    fullName: "João Almeida",
    preferred: "Jão",
    ageGroup: "teen",
    gender: "male",
    level: "a1",
    birthday: "2010-02-09",
    classroomIdx: 2,
    photo:
      "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2023-11-22",
    diligence: 0.45,
    completionRate: 0.4,
    tuitionCents: 24000,
    payRate: 0.9,
    progression: "a1.2",
    notes: "Plays more than studies — but catches up the day before class.",
  },
  // 11. Karina — left 2024, came back in 2025.
  {
    email: "demo.karina@amazingschool.app",
    fullName: "Karina Moraes",
    preferred: "Kari",
    ageGroup: "adult",
    gender: "female",
    level: "b2",
    birthday: "1993-04-28",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2023-04-22",
    diligence: 0.75,
    completionRate: 0.78,
    tuitionCents: 34000,
    payRate: 0.95,
    progression: "b2.1",
    notes: "Took a 3-month break mid-2024 for maternity, then full-on again.",
  },
  // 12. Lucas — advanced C1, infrequent high-quality bursts.
  {
    email: "demo.lucas@amazingschool.app",
    fullName: "Lucas Martins",
    preferred: "Lu",
    ageGroup: "adult",
    gender: "male",
    level: "c1",
    birthday: "1986-10-11",
    classroomIdx: 1,
    photo:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2024-05-05",
    diligence: 0.38,
    completionRate: 0.85,
    tuitionCents: 42000,
    payRate: 0.98,
    progression: "c1.2",
    notes: "Polishing C1 — prefers 1h deep-dive sessions.",
  },
  // 13. Mariana — kid (close to teen), sporadic.
  {
    email: "demo.mariana@amazingschool.app",
    fullName: "Mariana Araújo",
    preferred: "Mari",
    ageGroup: "teen",
    gender: "female",
    level: "a2",
    birthday: "2011-09-18",
    classroomIdx: 2,
    photo:
      "https://images.unsplash.com/photo-1496440737103-cd596325d314?w=800&h=800&fit=crop&crop=faces&auto=format&q=80",
    joinedAt: "2025-03-12",
    diligence: 0.58,
    completionRate: 0.6,
    tuitionCents: 26000,
    payRate: 0.92,
    progression: "a2.1",
    notes: "Loves music lessons more than grammar.",
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
  {
    name: "A1 Saturday Kids",
    description:
      "Saturday-morning group for young learners — songs, games, alphabet.",
    inviteCode: "DEMO-SAT",
  },
];

// 3 years of history — classroom-wide assignments fan out from this
// date even for students who joined later, so the classroom looks
// like a living thing with a past rather than a fresh install.
const START_DATE_GLOBAL = new Date("2023-04-01T12:00:00Z");
const IDS_FILE = resolve("scripts/demo-ids.json");

type DemoIds = {
  teacher: { id: string; email: string };
  students: { id: string; rosterId: string; email: string }[];
  classroomIds: string[];
};

// ---------------------------------------------------------------------------
// RNG / helpers
// ---------------------------------------------------------------------------
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
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function atHour(d: Date, hour: number, rng: () => number): Date {
  return new Date(
    d.getTime() + (hour + rng() * 1.5) * 3600_000,
  );
}
function pickOne<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("⏳ Seeding demo teacher + 13 students …");

  // 1) Auth users
  console.log("  ▸ auth users …");
  const teacherId = await ensureAuthUser(
    TEACHER_SPEC.email,
    DEMO_PASSWORD,
    TEACHER_SPEC.fullName,
  );
  const studentIds: string[] = [];
  for (const s of STUDENT_SPECS) {
    studentIds.push(await ensureAuthUser(s.email, DEMO_PASSWORD, s.fullName));
  }

  // 2) Profiles + avatars (needed before classrooms — FK)
  for (const p of [
    {
      id: teacherId,
      fullName: TEACHER_SPEC.fullName,
      photo: TEACHER_SPEC.photo,
      role: "teacher" as const,
    },
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
      console.warn(`    ! avatar failed: ${(e as Error).message}`);
    }
    const { error } = await admin.from("profiles").upsert(
      {
        id: p.id,
        full_name: p.fullName,
        role: p.role,
        avatar_url: `${p.id}.webp`,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(`profile ${p.fullName}: ${error.message}`);
  }

  // 3) Classrooms
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
    } else {
      const { data: hit } = await admin
        .from("roster_students")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("email", s.email)
        .maybeSingle();
      rosterId = (hit as { id: string } | null)?.id ?? crypto.randomUUID();
    }
    await admin.from("roster_students").upsert(
      {
        id: rosterId,
        teacher_id: teacherId,
        classroom_id: classroomIds[s.classroomIdx],
        full_name: s.fullName,
        preferred_name: s.preferred,
        email: s.email,
        notes: s.notes,
        has_avatar: false,
        age_group: s.ageGroup,
        gender: s.gender,
        level: s.level,
        birthday: s.birthday,
        auth_user_id: studentId,
        monthly_tuition_cents: s.tuitionCents,
        billing_day: 10,
        billing_starts_on: s.joinedAt,
      },
      { onConflict: "id" },
    );
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

  // 6) Persist ids
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
  console.log(`   Teacher: ${TEACHER_SPEC.email} / ${DEMO_PASSWORD}`);
  console.log(`   Ana:     ${STUDENT_SPECS[0].email} / ${DEMO_PASSWORD}`);
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

type TimelineArgs = {
  teacherId: string;
  studentIds: string[];
  rosterIds: string[];
  classroomIds: string[];
};

async function seedTimeline(args: TimelineArgs) {
  const { teacherId, studentIds, rosterIds, classroomIds } = args;
  const now = new Date();

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
  const diaryRows: Row[] = [];
  const historyRows: Row[] = [];
  const scheduledRows: Row[] = [];

  // -----------------------------------------------------------------
  // 5a) Classroom-wide assignments per classroom, once every ~10 days
  // -----------------------------------------------------------------
  for (let ci = 0; ci < classroomIds.length; ci++) {
    const classroomId = classroomIds[ci];
    const studentsIn = STUDENT_SPECS.filter((s) => s.classroomIdx === ci);
    const levelKey = studentsIn[0]?.level ?? "a1";
    const pool = (lessonsByLevel[`${levelKey}.1`] ?? []).concat(
      lessonsByLevel[`${levelKey}.2`] ?? [],
    );
    if (pool.length === 0) continue;
    const rng = mulberry32(hashStringToSeed(`cw:${classroomId}`));
    const totalDays = daysBetween(START_DATE_GLOBAL, now);
    const used = new Set<string>();
    for (let d = 0; d < totalDays; d += 9 + Math.floor(rng() * 5)) {
      const available = pool.filter((s) => !used.has(s));
      if (available.length === 0) break;
      const pick = available[Math.floor(rng() * available.length)];
      used.add(pick);
      const when = addDays(START_DATE_GLOBAL, d);
      assignmentRows.push({
        id: crypto.randomUUID(),
        classroom_id: classroomId,
        lesson_slug: pick,
        assigned_by: teacherId,
        assigned_at: when.toISOString(),
        due_date: isoDate(addDays(when, 14)),
        student_id: null,
        roster_student_id: null,
        order_index: 0,
        status: "assigned",
      });
    }
  }

  // -----------------------------------------------------------------
  // 5b) Per-student timeline (activity, XP, assignments, diary, …)
  // -----------------------------------------------------------------
  for (let i = 0; i < STUDENT_SPECS.length; i++) {
    const s = STUDENT_SPECS[i];
    const studentId = studentIds[i];
    const rosterId = rosterIds[i];
    const classroomId = classroomIds[s.classroomIdx];
    const joinDate = new Date(`${s.joinedAt}T09:00:00Z`);
    const stopDate = s.droppedAt ? new Date(`${s.droppedAt}T12:00:00Z`) : now;
    const activeDays = daysBetween(joinDate, stopDate);
    const rng = mulberry32(hashStringToSeed(`${studentId}:${s.email}`));

    const isAna = s.preferred === "Ana";

    // -----------------------------------------------------------------
    // CEFR-ordered assignment walk. Each student has a `progression`
    // pointing to the level they're CURRENTLY working through. We
    // walk LEVEL_ORDER from a1.1 up to their current, slicing the
    // active timeline into even chunks per level so older levels
    // landed in the earliest months and the current level fills the
    // most recent stretch. Completion status cascades:
    //   - past levels: mostly completed, a sprinkle of skipped
    //   - current level: front half completed, middle mixed, tail
    //                    still "assigned" (not done yet)
    //   - music from the level's CEFR band is interleaved so the
    //     chart's music band actually fires
    // Every lesson_progress row we emit carries an XP event tied to
    // it — no free-floating XP anywhere. Same for music completions.
    // -----------------------------------------------------------------
    const progressionIdx = LEVEL_ORDER.indexOf(s.progression);
    const activeLevels = LEVEL_ORDER.slice(0, progressionIdx + 1);
    const usedTargeted = new Set<string>();
    const completedSlugs = new Set<string>();
    let totalCompleted = 0;
    const firstLessonDates: { slug: string; completedAt: Date }[] = [];
    const levelSpanDays = Math.max(
      30,
      Math.floor(activeDays / Math.max(1, activeLevels.length)),
    );

    for (let li = 0; li < activeLevels.length; li++) {
      const levelKey = activeLevels[li];
      const isCurrent = li === activeLevels.length - 1;
      const slugs = [...(lessonsByLevel[levelKey] ?? [])];
      // Attach music from this CEFR band to the rotation. Music and
      // grammar lessons coexist in the ordered timeline at roughly
      // 1 music per 3 lessons.
      const levelPrefix = levelKey.slice(0, 2); // "a1" | "a2" | ...
      const levelMusic = allMusic
        .filter((m) => m.level.startsWith(levelPrefix))
        .map((m) => `music:${m.slug}`)
        // Limit how much music lands in any single level's window
        .slice(0, Math.max(2, Math.floor(slugs.length / 3)));
      const timeline: string[] = [];
      let musicIdx = 0;
      for (let k = 0; k < slugs.length; k++) {
        timeline.push(slugs[k]);
        if ((k + 1) % 3 === 0 && musicIdx < levelMusic.length) {
          timeline.push(levelMusic[musicIdx++]);
        }
      }
      while (musicIdx < levelMusic.length) {
        timeline.push(levelMusic[musicIdx++]);
      }

      const windowStartD = li * levelSpanDays;
      const windowEndD = Math.min(activeDays, (li + 1) * levelSpanDays);
      const span = Math.max(1, windowEndD - windowStartD);

      // Ana — the rockstar persona — does marathon sessions: 3-4
      // lessons + a music track crammed into a single afternoon.
      // We cluster her timeline into groups so her completions pile
      // onto the same day, giving the activity chart those tall
      // stacked "busy day" spikes instead of one matchstick per day.
      const clusterSize = isAna ? 3 + Math.floor(rng() * 2) : 1;

      for (let k = 0; k < timeline.length; k++) {
        const pick = timeline[k];
        if (usedTargeted.has(pick)) continue;
        usedTargeted.add(pick);
        const cluster = Math.floor(k / clusterSize);
        const totalClusters = Math.max(
          1,
          Math.ceil(timeline.length / clusterSize),
        );
        const t = cluster / Math.max(1, totalClusters - 1);
        const d = windowStartD + Math.floor(t * (span - 1));
        const when = addDays(joinDate, d);
        if (when > stopDate) break;

        let status: "completed" | "skipped" | "assigned";
        if (!isCurrent) {
          // Past level — mostly done, occasional skip.
          status = rng() < 0.9 ? "completed" : "skipped";
        } else {
          // Current level — front completed, middle mixed, tail
          // still assigned so the student has visible TODOs.
          if (t < 0.55) {
            status = rng() < 0.9 ? "completed" : "skipped";
          } else if (t < 0.75) {
            const r = rng();
            status = r < 0.45 ? "completed" : r < 0.7 ? "skipped" : "assigned";
          } else {
            status = "assigned";
          }
        }

        assignmentRows.push({
          id: crypto.randomUUID(),
          classroom_id: classroomId,
          lesson_slug: pick,
          assigned_by: teacherId,
          assigned_at: when.toISOString(),
          due_date: null,
          student_id: null,
          roster_student_id: rosterId,
          order_index: k,
          status,
        });

        if (status === "completed" && !completedSlugs.has(pick)) {
          completedSlugs.add(pick);
          // Ana's cluster-mates share the SAME calendar day (just
          // stagger the hour). Everyone else gets the usual small
          // lag between assigned-at and completed-at.
          const slotInCluster = k % clusterSize;
          const started = isAna
            ? atHour(when, 9 + slotInCluster * 1.3, rng)
            : atHour(when, 9 + rng() * 4, rng);
          const lagDays = isAna
            ? 0
            : rng() < 0.3
              ? 0
              : 1 + Math.floor(rng() * 4);
          const completed = new Date(
            addDays(started, lagDays).getTime() + 25 * 60_000,
          );
          if (completed <= stopDate) {
            progressRows.push({
              id: crypto.randomUUID(),
              student_id: studentId,
              lesson_slug: pick,
              classroom_id: classroomId,
              completed_exercises: 4,
              total_exercises: 4,
              started_at: started.toISOString(),
              completed_at: completed.toISOString(),
            });
            firstLessonDates.push({ slug: pick, completedAt: completed });
            totalCompleted++;
            // XP event — tied 1:1 to the progress row. Music pays a
            // little less than lessons because the exercises are
            // shorter, which matches lesson-completion.ts in prod.
            const xpForThis = pick.startsWith("music:")
              ? 25 + Math.floor(rng() * 15)
              : 35 + Math.floor(rng() * 25);
            xpRows.push({
              id: crypto.randomUUID(),
              student_id: studentId,
              classroom_id: classroomId,
              xp_amount: xpForThis,
              source: "lesson",
              source_id: pick,
              created_at: completed.toISOString(),
            });
          }
        }
      }
    }

    // Daily activity + chat XP — the lesson XP is already recorded
    // per-completion above, so this pass only tracks engagement
    // (daily_activity rows + streak bonuses). lesson_count on the
    // activity row is just an engagement signal for the chart, not
    // a duplicate XP source.
    const completionsByDate = new Map<string, number>();
    for (const p of progressRows.filter((r) => r.student_id === studentId)) {
      const iso = (p as { completed_at: string }).completed_at.slice(0, 10);
      completionsByDate.set(iso, (completionsByDate.get(iso) ?? 0) + 1);
    }
    for (let d = 0; d < activeDays; d++) {
      const day = addDays(joinDate, d);
      if (day > now) break;
      const dow = day.getUTCDay();
      const weekendBias = dow === 0 || dow === 6 ? 0.55 : 1.1;
      const moodMultiplier =
        0.7 + Math.sin((d + i * 9) / 14) * 0.25 + rng() * 0.2;
      const keyIso = isoDate(day);
      const lessonsThisDay = completionsByDate.get(keyIso) ?? 0;
      const chatActive =
        rng() <= s.diligence * weekendBias * (isAna ? 1 : moodMultiplier);
      if (lessonsThisDay === 0 && !chatActive) continue;
      const chatMsgs = chatActive && rng() < 0.55 ? 3 + Math.floor(rng() * 7) : 0;
      activityRows.push({
        student_id: studentId,
        activity_date: keyIso,
        lesson_count: lessonsThisDay,
        chat_messages: chatMsgs,
      });
      if (lessonsThisDay > 0 && rng() < 0.18) {
        xpRows.push({
          id: crypto.randomUUID(),
          student_id: studentId,
          classroom_id: classroomId,
          xp_amount: 10 + Math.floor(rng() * 15),
          source: "streak_bonus",
          source_id: null,
          created_at: atHour(day, 20, rng).toISOString(),
        });
      }
    }

    // Recent-day guarantee — ensure every (still-active) student has
    // activity within the last 7 days so "Your activity" is never empty.
    if (!s.droppedAt) {
      const within = activityRows
        .filter(
          (r) =>
            r.student_id === studentId &&
            typeof r.activity_date === "string" &&
            new Date((r as { activity_date: string }).activity_date as string) >=
              addDays(now, -7),
        )
        .length;
      if (within === 0) {
        const recentDay = addDays(now, -2);
        activityRows.push({
          student_id: studentId,
          activity_date: isoDate(recentDay),
          lesson_count: 1,
          chat_messages: 2,
        });
        xpRows.push({
          id: crypto.randomUUID(),
          student_id: studentId,
          classroom_id: classroomId,
          xp_amount: 25,
          source: "lesson",
          source_id: null,
          created_at: atHour(recentDay, 16, rng).toISOString(),
        });
      }
    }

    // Conversations (fewer for dropped students)
    const convGap = isAna ? 9 : 14 + Math.floor(rng() * 10);
    for (let d = 4; d < activeDays; d += convGap + Math.floor(rng() * 6)) {
      const convId = crypto.randomUUID();
      const start = addDays(joinDate, d);
      if (start > now) break;
      conversationRows.push({
        id: convId,
        student_id: studentId,
        classroom_id: classroomId,
        created_at: start.toISOString(),
      });
      const turns = 4 + Math.floor(rng() * (isAna ? 8 : 5));
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

    // Badges — First Contact (signup day) + progression badges
    badgeRows.push({
      id: crypto.randomUUID(),
      student_id: studentId,
      badge_type: "welcome_aboard",
      earned_at: atHour(joinDate, 9, rng).toISOString(),
    });
    if (firstLessonDates.length > 0) {
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "first_lesson",
        earned_at: firstLessonDates[0].completedAt.toISOString(),
      });
    }
    if (totalCompleted >= 5) {
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "five_lessons",
        earned_at: firstLessonDates[Math.min(4, firstLessonDates.length - 1)]
          .completedAt.toISOString(),
      });
    }
    if (totalCompleted >= 25) {
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "bookworm",
        earned_at: firstLessonDates[24].completedAt.toISOString(),
      });
    }
    if (s.diligence > 0.7) {
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "streak_7",
        earned_at: addDays(joinDate, 14).toISOString(),
      });
    }
    if (s.diligence > 0.82) {
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "streak_30",
        earned_at: addDays(joinDate, 45).toISOString(),
      });
    }
    if (isAna) {
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "streak_90",
        earned_at: addDays(joinDate, 120).toISOString(),
      });
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "music_lover",
        earned_at: addDays(joinDate, 60).toISOString(),
      });
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "first_chat",
        earned_at: addDays(joinDate, 3).toISOString(),
      });
      badgeRows.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        badge_type: "perfect_lesson",
        earned_at: addDays(joinDate, 12).toISOString(),
      });
    }

    // Monthly payments — respect join date, drop date, debt months, seasonal break
    const firstBill = new Date(
      Date.UTC(joinDate.getUTCFullYear(), joinDate.getUTCMonth(), 10),
    );
    const lastBill = s.droppedAt
      ? new Date(
          Date.UTC(
            new Date(s.droppedAt).getUTCFullYear(),
            new Date(s.droppedAt).getUTCMonth(),
            10,
          ),
        )
      : now;
    const monthsCursor = new Date(firstBill);
    const paymentsList: Row[] = [];
    while (monthsCursor <= lastBill) {
      const ym = monthsCursor.getUTCMonth();
      const yr = monthsCursor.getUTCFullYear();
      // Karina's 3-month maternity break (2024-06,07,08)
      const isKarinaBreak =
        s.preferred === "Kari" &&
        yr === 2024 &&
        (ym === 5 || ym === 6 || ym === 7);
      // Helena skips December every year
      const isHelenaBreak = s.preferred === "Helê" && ym === 11;
      // Some monthly variation: occasional discount or surcharge
      const variation = rng();
      let amount = s.tuitionCents;
      if (variation < 0.08) amount = Math.round(s.tuitionCents * 0.8); // 20% discount
      else if (variation > 0.93) amount = Math.round(s.tuitionCents * 1.1); // surcharge

      const pay = rng() < s.payRate && !isKarinaBreak && !isHelenaBreak;
      paymentsList.push({
        id: crypto.randomUUID(),
        roster_student_id: rosterId,
        teacher_id: teacherId,
        billing_month: isoDate(new Date(Date.UTC(yr, ym, 1))),
        amount_cents: isKarinaBreak || isHelenaBreak ? 0 : amount,
        currency: "BRL",
        paid: pay,
        paid_at: pay
          ? new Date(
              monthsCursor.getTime() +
                Math.floor(rng() * 7 * 86_400_000),
            ).toISOString()
          : null,
        notes: isKarinaBreak
          ? "Maternity pause — free month"
          : isHelenaBreak
            ? "December break"
            : null,
      });
      monthsCursor.setUTCMonth(monthsCursor.getUTCMonth() + 1);
    }
    // Apply "debt months" — force most recent N to unpaid
    if (s.debtMonths && paymentsList.length >= s.debtMonths) {
      for (let k = 0; k < s.debtMonths; k++) {
        const row = paymentsList[paymentsList.length - 1 - k] as {
          paid: boolean;
          paid_at: string | null;
        };
        row.paid = false;
        row.paid_at = null;
      }
    }
    paymentRows.push(...paymentsList);

    // Diary entries — sprinkled across the active period, denser for Ana
    const diaryCadence = isAna ? 10 : 22 + Math.floor(rng() * 18);
    const diaryPool = isAna ? DIARY_ANA : DIARY_GENERIC;
    const moodPool: string[] = ["great", "good", "ok", "tough", "rough"];
    for (let d = 6; d < activeDays; d += diaryCadence + Math.floor(rng() * 8)) {
      const day = addDays(joinDate, d);
      if (day > now) break;
      const text = pickOne(rng, diaryPool);
      const mood = pickOne(rng, moodPool);
      diaryRows.push({
        id: crypto.randomUUID(),
        roster_student_id: rosterId,
        teacher_id: teacherId,
        body: text.replace("{name}", s.preferred),
        mood,
        entry_date: isoDate(day),
        created_at: atHour(day, 18 + rng() * 3, rng).toISOString(),
        updated_at: atHour(day, 18 + rng() * 3, rng).toISOString(),
      });
    }

    // Student history — roughly one entry per week, mix of statuses
    for (let d = 2; d < activeDays; d += 7) {
      const day = addDays(joinDate, d);
      if (day > now) break;
      const r = rng();
      const status =
        r < 0.72
          ? "Done"
          : r < 0.8
            ? "Absent"
            : r < 0.88
              ? "Rescheduled by student"
              : r < 0.93
                ? "Rescheduled by teacher"
                : r < 0.98
                  ? "Make up class"
                  : "Planned";
      const skillFocus = pickOne(rng, SKILL_FOCUS_POOL);
      const lessonContent = pickOne(rng, LESSON_CONTENT_POOL[s.level] ?? LESSON_CONTENT_POOL.a2);
      historyRows.push({
        id: crypto.randomUUID(),
        teacher_id: teacherId,
        student_id: null,
        roster_student_id: rosterId,
        classroom_id: classroomId,
        event_date: isoDate(day),
        event_time: "18:00:00",
        status,
        lesson_content: lessonContent,
        skill_focus: skillFocus,
        meeting_link: `https://meet.google.com/${makeMeetCode(rng)}`,
        created_at: day.toISOString(),
        updated_at: day.toISOString(),
      });
    }

    // Scheduled classes — seed exactly once per classroom (first
    // student we encounter for that classroom). Generates a mix of
    // past sessions (going back ~6 weeks) and at least two upcoming
    // ones so the "Next class" widget always has something real to
    // point at, and the log shows real history.
    if (!s.droppedAt) {
      const firstInClassroom = STUDENT_SPECS.findIndex(
        (x) => x.classroomIdx === s.classroomIdx,
      );
      if (firstInClassroom === i) {
        // 6 past sessions (weeks -6 .. -1) + 2 future (+1, +2).
        const offsets = [-42, -35, -28, -21, -14, -7, 7, 14];
        for (const off of offsets) {
          const when = addDays(now, off);
          scheduledRows.push({
            id: crypto.randomUUID(),
            classroom_id: classroomId,
            title: pickOne(rng, SCHEDULED_TITLES),
            meeting_url: `https://meet.google.com/${makeMeetCode(rng)}`,
            scheduled_at: atHour(when, 18, rng).toISOString(),
            created_by: teacherId,
            created_at: addDays(when, -3).toISOString(),
          });
        }
      }
    }
  }

  console.log(
    `  ▸ rows — activity:${activityRows.length} xp:${xpRows.length} ` +
      `progress:${progressRows.length} assignments:${assignmentRows.length} ` +
      `convos:${conversationRows.length} msgs:${messageRows.length} ` +
      `badges:${badgeRows.length} payments:${paymentRows.length} ` +
      `diary:${diaryRows.length} history:${historyRows.length} ` +
      `scheduled:${scheduledRows.length}`,
  );

  await clearPrior(studentIds, rosterIds, classroomIds, args.teacherId);

  // Dedup daily_activity (student_id,activity_date) — multiple codepaths can emit the same row.
  const seenAct = new Set<string>();
  const dedupedActivity = activityRows.filter((r) => {
    const k = `${r.student_id}:${r.activity_date}`;
    if (seenAct.has(k)) return false;
    seenAct.add(k);
    return true;
  });

  // Dedup lesson_progress on (student_id, lesson_slug, classroom_id)
  // to respect the table's unique constraint. The CEFR walk protects
  // against dupes within a student, but belt-and-suspenders here keeps
  // insert from exploding if any future code path ever overlaps.
  const seenProgress = new Set<string>();
  const dedupedProgress = progressRows.filter((r) => {
    const k = `${r.student_id}:${r.lesson_slug}:${r.classroom_id}`;
    if (seenProgress.has(k)) return false;
    seenProgress.add(k);
    return true;
  });

  // Dedup lesson_assignments on (classroom_id, lesson_slug, roster_student_id)
  // so classroom-wide + per-roster walks can't produce two tiles
  // for the same lesson (teacher UI would look broken).
  const seenAssign = new Set<string>();
  const dedupedAssign = assignmentRows.filter((r) => {
    const k = `${r.classroom_id}:${r.lesson_slug}:${r.roster_student_id ?? "classroom"}`;
    if (seenAssign.has(k)) return false;
    seenAssign.add(k);
    return true;
  });

  await bulkInsert("daily_activity", dedupedActivity, 500);
  await bulkInsert("xp_events", xpRows, 500);
  await bulkInsert("lesson_progress", dedupedProgress, 500);
  await bulkInsert("lesson_assignments", dedupedAssign, 500);
  await bulkInsert("conversations", conversationRows, 500);
  await bulkInsert("messages", messageRows, 500);
  await bulkInsert("badges", badgeRows, 300);
  await bulkInsert("student_payments", paymentRows, 300);
  await bulkInsert("roster_diary", diaryRows, 300);
  await bulkInsert("student_history", historyRows, 300);
  await bulkInsert("scheduled_classes", scheduledRows, 200);
}

async function clearPrior(
  studentIds: string[],
  rosterIds: string[],
  classroomIds: string[],
  teacherId: string,
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
  await admin
    .from("roster_diary")
    .delete()
    .in("roster_student_id", rosterIds);
  await admin
    .from("student_history")
    .delete()
    .eq("teacher_id", teacherId);
  await admin
    .from("scheduled_classes")
    .delete()
    .in("classroom_id", classroomIds);
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

// ---------------------------------------------------------------------------
// Content pools
// ---------------------------------------------------------------------------

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
  c1: [
    "Could you flag any register issues in this cover letter?",
    "Is 'notwithstanding' overkill in a LinkedIn post?",
    "Recommend three advanced idioms for business negotiations.",
    "I want a sharper verb than 'handle' for stakeholder management.",
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
  c1: [
    "Register is fine — trim 'I would kindly request' to 'I'd appreciate'.",
    "Too formal for LinkedIn — try 'despite that' or 'even so'.",
    "Try 'move the needle', 'split the difference', 'bring them along'.",
    "Use 'orchestrate', 'align', or 'shepherd' depending on the vibe.",
  ],
};

function pickStudentLine(rng: () => number, level: string): string {
  const pool =
    STUDENT_LINES[level as keyof typeof STUDENT_LINES] ?? STUDENT_LINES.a2;
  return pool[Math.floor(rng() * pool.length)];
}
function pickTutorLine(rng: () => number, level: string): string {
  const pool =
    TUTOR_LINES[level as keyof typeof TUTOR_LINES] ?? TUTOR_LINES.a2;
  return pool[Math.floor(rng() * pool.length)];
}

const DIARY_ANA = [
  "{name} absolutely nailed the pronunciation drills today — 'th' is finally clicking.",
  "Had a long chat about the reading homework. {name} noticed three idioms on her own.",
  "{name} asked for harder material. Giving her B2 listening next week.",
  "Rough day — tired from school but pushed through. Praised her persistence.",
  "Breakthrough! {name} used 'used to' naturally in an unprompted story.",
  "Confidence up — she volunteered to present the article summary first.",
  "Asked about prepositions of place. We drew a little map. She remembered them all.",
  "Energy lower than usual. Noted to start next class with a warm-up she likes.",
  "Loved today's song activity. Wrote the chorus from memory.",
  "{name} is reading a chapter of 'Charlotte's Web'. Two new idioms found.",
];
const DIARY_GENERIC = [
  "Went over conditional tenses — {name} needs more practice with third conditional.",
  "{name} nailed the past simple questions today. Great energy.",
  "Short class — covered vocabulary for ordering food. Homework assigned.",
  "Reading comprehension: {name} picked up the main idea quickly.",
  "Focus on connectors next time — {name} overuses 'and'.",
  "Pronunciation session. Worked on 'th' vs 'f'. Improving slowly.",
  "Writing exercise: email to a landlord. Solid structure, minor tense slips.",
  "Role-play: job interview. {name} was surprisingly natural!",
  "Reviewed phrasal verbs with 'get'. Tomorrow: 'take'.",
  "Quiet class — asked {name} to prepare a short talk for next session.",
];

const SKILL_FOCUS_POOL: string[][] = [
  ["grammar", "listening"],
  ["reading", "vocabulary"],
  ["speaking"],
  ["writing", "grammar"],
  ["pronunciation", "speaking"],
  ["listening", "speaking"],
  ["vocabulary"],
  ["grammar"],
  ["writing"],
];
const LESSON_CONTENT_POOL: Record<string, string[]> = {
  a1: [
    "Greetings and introductions",
    "Numbers 1–100 and days of the week",
    "Alphabet & spelling practice",
    "Verb 'to be' in positive and negative",
    "Simple present with daily routines",
  ],
  a2: [
    "Past simple irregular verbs",
    "'Used to' for past habits",
    "Prepositions of place and movement",
    "Quantifiers: some, any, much, many",
    "Comparatives and superlatives",
  ],
  b1: [
    "First vs second conditional",
    "Connectors for essays: however, moreover, therefore",
    "Phrasal verbs with 'get'",
    "Present perfect continuous vs present perfect",
    "Reported speech — statements and questions",
  ],
  b2: [
    "Third conditional and mixed conditionals",
    "Cleft sentences for emphasis",
    "Advanced phrasal verbs — business contexts",
    "Formal register and hedging",
    "Essay: argumentative structure",
  ],
  c1: [
    "Nuanced modal verbs for speculation",
    "Cohesion and coherence in long writing",
    "Idiomatic language in negotiation",
    "Advanced collocations for reviews",
    "Register shifts — academic vs conversational",
  ],
};

const SCHEDULED_TITLES = [
  "Weekly check-in",
  "Writing feedback session",
  "Reading club — chapter discussion",
  "Speaking drill (pronunciation)",
  "Mock exam review",
  "Listening lab — podcast analysis",
  "Q&A and homework review",
];

function makeMeetCode(rng: () => number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const seg = (n: number) =>
    Array.from({ length: n }, () =>
      alphabet[Math.floor(rng() * alphabet.length)],
    ).join("");
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
