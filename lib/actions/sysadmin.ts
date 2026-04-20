"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";

/**
 * Owner sysadmin overview — aggregate platform data only. By design, this
 * action never exposes per-student revenue, per-teacher tuition rates, or
 * individual chat message contents; those stay scoped to the owning
 * teacher / student.
 *
 * Every number here is derived from table counts, aggregations, or
 * presence booleans. If a new KPI is added, keep it aggregate.
 */
export interface SysadminOverview {
  kpis: {
    teachers: number;
    students: number;
    classrooms: number;
    rosterEntries: number;
    demoAccounts: number;
    publishedLessons: number;
    draftLessons: number;
    catalogLessons: number;
    catalogSongs: number;
    dau: number;
    wau: number;
    mau: number;
    newAccountsThisMonth: number;
    newAccountsLast30d: number;
    lessonsCompletedLast30d: number;
    lessonsAssignedLast30d: number;
    xpLast30d: number;
    aiMessagesLast30d: number;
    conversationsLast30d: number;
    activeTuitionSeats: number;
    paidInvoicesThisMonth: number;
    pendingInvoicesThisMonth: number;
  };
  growth: { week: string; newAccounts: number; newLessons: number }[];
  engagement: { date: string; activeStudents: number }[];
  levelMix: { level: string; count: number }[];
  topTeachers: {
    id: string;
    name: string;
    studentCount: number;
    activeStudentsLast30d: number;
    classroomsCount: number;
    createdAt: string;
  }[];
  /**
   * Every teacher on the platform with their headline counts. No
   * activity window, no revenue, no chat content — just existence
   * + capacity numbers for the sysadmin directory view.
   */
  allTeachers: {
    id: string;
    name: string;
    email: string | null;
    studentCount: number;
    classroomsCount: number;
    activeStudentsLast30d: number;
    createdAt: string;
  }[];
  topActiveStudents: {
    id: string;
    displayName: string;
    /** Teacher this student is rostered under. Null if unrostered. */
    teacherName: string | null;
    xpLast30d: number;
    streak: number;
    cefrLevel: string | null;
  }[];
  /** Same shape as topActiveStudents but ranked on lifetime XP. */
  allTimeTopStudents: {
    id: string;
    displayName: string;
    teacherName: string | null;
    xpTotal: number;
    cefrLevel: string | null;
  }[];
  /**
   * Estimated minutes spent on the platform per user. For students
   * we sum the actual (completed_at − started_at) deltas across
   * their lesson_progress rows — real work time. For teachers we
   * count distinct calendar days they touched the platform
   * (assignments / diary / history rows they authored) and credit
   * 15 minutes per active day as a conservative proxy since we
   * don't log teacher sessions directly. Both arrays are sorted
   * descending by minutes.
   */
  timeOnSite: {
    teachers: {
      id: string;
      name: string;
      minutes: number;
      activeDays: number;
    }[];
    students: {
      id: string;
      displayName: string;
      teacherName: string | null;
      minutes: number;
      lessons: number;
    }[];
  };
  contentMix: {
    lessonsPerCefr: { level: string; count: number }[];
    songsPerCefr: { level: string; count: number }[];
  };
  health: {
    storageAvatarBytes: number;
    storageAvatarCount: number;
    accountsWithoutAvatar: number;
    classroomsWithoutStudents: number;
    rosterWithoutAuthUser: number;
  };
}

const MS_DAY = 86_400_000;

export async function getSysadminOverview(): Promise<
  SysadminOverview | { error: string }
> {
  const owner = await isOwner();
  if (!owner) return { error: "Owner access only" };

  const admin = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
    .toISOString()
    .slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_DAY)
    .toISOString()
    .slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_DAY)
    .toISOString()
    .slice(0, 10);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * MS_DAY);

  // Many queries run in parallel.
  const [
    profilesRes,
    classroomsRes,
    rosterRes,
    classroomMembersRes,
    draftsRes,
    conversationsRes,
    messagesRes,
    xpRes,
    dailyAllRes,
    dailyTodayRes,
    dailyWeekRes,
    assignmentsRes,
    progressRes,
    paymentsRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, avatar_url, created_at")
      // Sysadmin view is scoped to REAL users only — demo / staging
      // accounts are marked with is_test=true and hidden everywhere
      // across the dashboard.
      .eq("is_test", false)
      .order("created_at", { ascending: false }),
    admin.from("classrooms").select("id, teacher_id, created_at"),
    admin
      .from("roster_students")
      .select(
        "id, teacher_id, classroom_id, level, has_avatar, auth_user_id, monthly_tuition_cents, created_at",
      ),
    admin.from("classroom_members").select("classroom_id, student_id"),
    admin
      .from("lesson_drafts")
      .select("id, status, created_at")
      .limit(10_000),
    admin
      .from("conversations")
      .select("id, classroom_id, created_at")
      .gte("created_at", `${thirtyDaysAgo}T00:00:00`),
    admin
      .from("messages")
      .select("id, conversation_id, created_at")
      .gte("created_at", `${thirtyDaysAgo}T00:00:00`)
      .limit(50_000),
    admin
      .from("xp_events")
      .select("xp_amount, classroom_id, created_at")
      .gte("created_at", `${thirtyDaysAgo}T00:00:00`)
      .limit(50_000),
    admin
      .from("daily_activity")
      .select("student_id, activity_date")
      .gte("activity_date", thirtyDaysAgo)
      .limit(50_000),
    admin
      .from("daily_activity")
      .select("student_id")
      .eq("activity_date", today)
      .limit(10_000),
    admin
      .from("daily_activity")
      .select("student_id")
      .gte("activity_date", sevenDaysAgo)
      .limit(20_000),
    admin
      .from("lesson_assignments")
      .select("id, classroom_id, assigned_at")
      .gte("assigned_at", `${thirtyDaysAgo}T00:00:00`)
      .limit(50_000),
    admin
      .from("lesson_progress")
      .select("id, classroom_id, completed_at")
      .gte("completed_at", `${thirtyDaysAgo}T00:00:00`)
      .not("completed_at", "is", null)
      .limit(50_000),
    admin
      .from("student_payments")
      .select("paid, billing_month, teacher_id")
      .gte("billing_month", startOfMonth),
  ]);

  const profiles = (profilesRes.data ?? []) as Array<{
    id: string;
    full_name: string;
    role: "teacher" | "student";
    avatar_url: string | null;
    created_at: string;
  }>;

  const teachers = profiles.filter((p) => p.role === "teacher");
  const students = profiles.filter((p) => p.role === "student");
  const demoAccounts = profiles.filter((p) =>
    p.full_name ? false : false,
  ).length;
  // Demo detection is by email prefix — we need auth data for that.
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const demoIds = new Set(
    (authList?.users ?? [])
      .filter((u) => (u.email ?? "").toLowerCase().startsWith("demo."))
      .map((u) => u.id),
  );
  const demoCount = demoIds.size;

  const classrooms = (classroomsRes.data ?? []) as Array<{
    id: string;
    teacher_id: string;
    created_at: string;
  }>;
  const roster = (rosterRes.data ?? []) as Array<{
    id: string;
    teacher_id: string;
    classroom_id: string | null;
    level: string | null;
    has_avatar: boolean;
    auth_user_id: string | null;
    monthly_tuition_cents: number | null;
    created_at: string;
  }>;
  const members = (classroomMembersRes.data ?? []) as Array<{
    classroom_id: string;
    student_id: string;
  }>;
  const drafts = (draftsRes.data ?? []) as Array<{
    id: string;
    status: string;
    created_at: string;
  }>;
  const publishedLessons = drafts.filter((d) => d.status === "published").length;
  const draftLessons = drafts.filter((d) => d.status !== "published").length;

  // Build sets of real (non-test) user / classroom ids so every
  // aggregation that follows can drop demo rows in memory. We already
  // filtered `profiles` by is_test = false upstream; these sets come
  // from those filtered lists.
  const realUserIds = new Set<string>([
    ...teachers.map((p) => p.id),
    ...students.map((p) => p.id),
  ]);
  const realClassroomIds = new Set<string>(
    classrooms
      .filter((c) => teachers.some((t) => t.id === c.teacher_id))
      .map((c) => c.id),
  );

  // daily_activity → keyed on student_id (auth user). Filter by real set.
  const dailyAll = (
    (dailyAllRes.data ?? []) as Array<{
      student_id: string;
      activity_date: string;
    }>
  ).filter((r) => realUserIds.has(r.student_id));
  const dau = new Set(
    (dailyTodayRes.data ?? [])
      .map((r) => (r as { student_id: string }).student_id)
      .filter((sid) => realUserIds.has(sid)),
  ).size;
  const wau = new Set(
    (dailyWeekRes.data ?? [])
      .map((r) => (r as { student_id: string }).student_id)
      .filter((sid) => realUserIds.has(sid)),
  ).size;
  const mau = new Set(dailyAll.map((r) => r.student_id)).size;

  // xp_events / lesson_progress / lesson_assignments / conversations /
  // messages are classroom-scoped; filter by realClassroomIds.
  const xpLast30d = (xpRes.data ?? [])
    .filter((r) =>
      realClassroomIds.has(
        (r as { classroom_id?: string }).classroom_id ?? "",
      ),
    )
    .reduce((sum, r) => sum + ((r as { xp_amount: number }).xp_amount ?? 0), 0);
  const lessonsAssignedLast30d = (assignmentsRes.data ?? []).filter((r) =>
    realClassroomIds.has((r as { classroom_id?: string }).classroom_id ?? ""),
  ).length;
  const lessonsCompletedLast30d = (progressRes.data ?? []).filter((r) =>
    realClassroomIds.has((r as { classroom_id?: string }).classroom_id ?? ""),
  ).length;
  const realConversationIds = new Set<string>(
    (conversationsRes.data ?? [])
      .filter((r) =>
        realClassroomIds.has(
          (r as { classroom_id?: string }).classroom_id ?? "",
        ),
      )
      .map((r) => (r as { id: string }).id),
  );
  const realConversationsCount = realConversationIds.size;
  const aiMessagesLast30d = (messagesRes.data ?? []).filter((r) =>
    realConversationIds.has((r as { conversation_id: string }).conversation_id),
  ).length;

  const payments = (
    (paymentsRes.data ?? []) as Array<{
      paid: boolean;
      billing_month: string;
      teacher_id?: string;
    }>
  ).filter((p) =>
    !p.teacher_id ? true : teachers.some((t) => t.id === p.teacher_id),
  );
  const paidInvoicesThisMonth = payments.filter(
    (p) => p.paid && p.billing_month === startOfMonth,
  ).length;
  const pendingInvoicesThisMonth = payments.filter(
    (p) => !p.paid && p.billing_month === startOfMonth,
  ).length;

  const newAccountsThisMonth = profiles.filter(
    (p) => p.created_at.slice(0, 10) >= startOfMonth,
  ).length;
  const newAccountsLast30d = profiles.filter(
    (p) => p.created_at.slice(0, 10) >= thirtyDaysAgo,
  ).length;

  // Growth — last 12 weeks, bucket by Monday
  const weekBuckets = new Map<string, { newAccounts: number; newLessons: number }>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getTime() - i * 7 * MS_DAY);
    const monday = getMonday(d);
    weekBuckets.set(monday, { newAccounts: 0, newLessons: 0 });
  }
  for (const p of profiles) {
    if (new Date(p.created_at) < twelveWeeksAgo) continue;
    const key = getMonday(new Date(p.created_at));
    const e = weekBuckets.get(key);
    if (e) e.newAccounts += 1;
  }
  for (const d of drafts) {
    if (new Date(d.created_at) < twelveWeeksAgo) continue;
    const key = getMonday(new Date(d.created_at));
    const e = weekBuckets.get(key);
    if (e) e.newLessons += 1;
  }
  const growth = [...weekBuckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, ...v }));

  // Engagement — DAU per day over last 30 days
  const engagementMap = new Map<string, Set<string>>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - i * MS_DAY).toISOString().slice(0, 10);
    engagementMap.set(d, new Set());
  }
  for (const r of dailyAll) {
    engagementMap.get(r.activity_date)?.add(r.student_id);
  }
  const engagement = [...engagementMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, set]) => ({ date, activeStudents: set.size }));

  // CEFR level mix
  const levelCounts = new Map<string, number>();
  for (const r of roster) {
    if (!r.level) continue;
    levelCounts.set(r.level, (levelCounts.get(r.level) ?? 0) + 1);
  }
  const levelMix = [...levelCounts.entries()]
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => a.level.localeCompare(b.level));

  // Top teachers — by # active students last 30d (no revenue exposed)
  const activeStudentIds = new Set(
    dailyAll
      .filter((r) => r.activity_date >= thirtyDaysAgo)
      .map((r) => r.student_id),
  );
  const studentsByTeacher = new Map<string, Set<string>>();
  const activeStudentsByTeacher = new Map<string, Set<string>>();
  const classroomsByTeacher = new Map<string, number>();
  for (const c of classrooms) {
    classroomsByTeacher.set(
      c.teacher_id,
      (classroomsByTeacher.get(c.teacher_id) ?? 0) + 1,
    );
  }
  for (const r of roster) {
    const teacherId = r.teacher_id;
    let s = studentsByTeacher.get(teacherId);
    if (!s) {
      s = new Set();
      studentsByTeacher.set(teacherId, s);
    }
    s.add(r.id);
    if (r.auth_user_id && activeStudentIds.has(r.auth_user_id)) {
      let a = activeStudentsByTeacher.get(teacherId);
      if (!a) {
        a = new Set();
        activeStudentsByTeacher.set(teacherId, a);
      }
      a.add(r.auth_user_id);
    }
  }
  const teacherNameById = new Map(teachers.map((t) => [t.id, t.full_name]));
  const teacherCreatedAt = new Map(teachers.map((t) => [t.id, t.created_at]));
  const teacherEmailById = new Map<string, string | null>();
  for (const u of authList?.users ?? []) {
    teacherEmailById.set(u.id, u.email ?? null);
  }
  const allTeachersFull = teachers.map((t) => ({
    id: t.id,
    name: t.full_name,
    email: teacherEmailById.get(t.id) ?? null,
    studentCount: studentsByTeacher.get(t.id)?.size ?? 0,
    activeStudentsLast30d: activeStudentsByTeacher.get(t.id)?.size ?? 0,
    classroomsCount: classroomsByTeacher.get(t.id) ?? 0,
    createdAt: teacherCreatedAt.get(t.id) ?? t.created_at,
  }));

  // Leaderboard (top 8 by activity) for the "Most active teachers" table.
  const topTeachers = [...allTeachersFull]
    .sort(
      (a, b) =>
        b.activeStudentsLast30d - a.activeStudentsLast30d ||
        b.studentCount - a.studentCount,
    )
    .slice(0, 8)
    .map(({ email: _unused, ...row }) => {
      void _unused;
      return row;
    });

  // Full directory — sort alphabetically by name for easy scanning.
  // Keeps activeStudentsLast30d so the table can show engagement
  // per teacher without needing a separate "most active" ranking.
  const allTeachers = [...allTeachersFull].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  // Top active students — by XP last 30 days. Test users (demo.*)
  // are already excluded from `students`/`profiles` so we drop any XP
  // events whose student_id isn't a real profile.
  const xpByStudent = new Map<string, number>();
  const { data: xpPerStudentRes } = await admin
    .from("xp_events")
    .select("student_id, xp_amount")
    .gte("created_at", `${thirtyDaysAgo}T00:00:00`)
    .limit(50_000);
  for (const x of (xpPerStudentRes ?? []) as Array<{
    student_id: string;
    xp_amount: number;
  }>) {
    if (!realUserIds.has(x.student_id)) continue;
    xpByStudent.set(
      x.student_id,
      (xpByStudent.get(x.student_id) ?? 0) + (x.xp_amount ?? 0),
    );
  }
  const rosterByAuthUser = new Map(
    roster.filter((r) => r.auth_user_id).map((r) => [r.auth_user_id!, r]),
  );
  // Cheap streak approximation: consecutive days with activity ending today/yesterday.
  const dailyByStudent = new Map<string, Set<string>>();
  for (const r of dailyAll) {
    let s = dailyByStudent.get(r.student_id);
    if (!s) {
      s = new Set();
      dailyByStudent.set(r.student_id, s);
    }
    s.add(r.activity_date);
  }
  function streakFor(studentId: string): number {
    const set = dailyByStudent.get(studentId);
    if (!set) return 0;
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * MS_DAY).toISOString().slice(0, 10);
      if (set.has(d)) streak += 1;
      else if (i > 0) break; // allow today being empty, but stop at first break
    }
    return streak;
  }

  const topActiveStudents = [...xpByStudent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([studentId, xp]) => {
      const r = rosterByAuthUser.get(studentId);
      const profile = profiles.find((p) => p.id === studentId);
      const teacherName = r?.teacher_id
        ? teacherNameById.get(r.teacher_id) ?? null
        : null;
      return {
        id: studentId,
        displayName: profile?.full_name ?? "Unknown",
        teacherName,
        xpLast30d: xp,
        streak: streakFor(studentId),
        cefrLevel: r?.level ?? null,
      };
    });

  // Lifetime XP — same real-users filter, no date bound. Separate
  // query so we don't reshape the existing 30-day pipeline.
  const xpLifetimeByStudent = new Map<string, number>();
  const { data: xpLifetimeRes } = await admin
    .from("xp_events")
    .select("student_id, xp_amount")
    .limit(200_000);
  for (const x of (xpLifetimeRes ?? []) as Array<{
    student_id: string;
    xp_amount: number;
  }>) {
    if (!realUserIds.has(x.student_id)) continue;
    xpLifetimeByStudent.set(
      x.student_id,
      (xpLifetimeByStudent.get(x.student_id) ?? 0) + (x.xp_amount ?? 0),
    );
  }
  const allTimeTopStudents = [...xpLifetimeByStudent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([studentId, xp]) => {
      const r = rosterByAuthUser.get(studentId);
      const profile = profiles.find((p) => p.id === studentId);
      const teacherName = r?.teacher_id
        ? teacherNameById.get(r.teacher_id) ?? null
        : null;
      return {
        id: studentId,
        displayName: profile?.full_name ?? "Unknown",
        teacherName,
        xpTotal: xp,
        cefrLevel: r?.level ?? null,
      };
    });

  // Content catalog mix — read JSON indexes
  let lessonsPerCefr: { level: string; count: number }[] = [];
  let songsPerCefr: { level: string; count: number }[] = [];
  let catalogLessons = 0;
  let catalogSongs = 0;
  try {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const lessonsIndex = JSON.parse(
      readFileSync(resolve("content/lessons/index.json"), "utf8"),
    ) as Array<{ cefr_level?: string; level?: string }>;
    catalogLessons = lessonsIndex.length;
    const byLesson = new Map<string, number>();
    for (const l of lessonsIndex) {
      const lvl = (l.cefr_level ?? l.level ?? "?").toUpperCase();
      byLesson.set(lvl, (byLesson.get(lvl) ?? 0) + 1);
    }
    lessonsPerCefr = [...byLesson.entries()]
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level.localeCompare(b.level));

    const musicIndex = JSON.parse(
      readFileSync(resolve("content/music/index.json"), "utf8"),
    ) as { songs: Array<{ cefr_level?: string }> };
    catalogSongs = musicIndex.songs.length;
    const bySong = new Map<string, number>();
    for (const s of musicIndex.songs) {
      const lvl = (s.cefr_level ?? "?").toUpperCase();
      bySong.set(lvl, (bySong.get(lvl) ?? 0) + 1);
    }
    songsPerCefr = [...bySong.entries()]
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level.localeCompare(b.level));
  } catch {
    // Non-fatal: the content files live in the deployed build, missing on edge.
  }

  // -----------------------------------------------------------------
  // Time on site — the only real session signal we have today is the
  // lesson_progress (completed_at − started_at) delta for students.
  // When a student closes the tab mid-lesson, started_at stays set
  // and completed_at never lands, so nothing gets counted — exactly
  // the behaviour we want. Teachers have no per-session table yet,
  // so we approximate from distinct calendar days they authored
  // something (assignments / diary / history) at 15 min per active
  // day. Both lists are sorted descending.
  // -----------------------------------------------------------------
  const [progressAllRes, assignmentsAllRes, diaryRes, historyRes] =
    await Promise.all([
      admin
        .from("lesson_progress")
        .select("student_id, started_at, completed_at")
        .not("completed_at", "is", null)
        .not("started_at", "is", null)
        .limit(200_000),
      admin
        .from("lesson_assignments")
        .select("assigned_by, assigned_at")
        .limit(200_000),
      admin
        .from("roster_diary")
        .select("teacher_id, created_at")
        .limit(200_000),
      admin
        .from("student_history")
        .select("teacher_id, created_at")
        .limit(200_000),
    ]);

  const studentMinutes = new Map<string, number>();
  const studentLessons = new Map<string, number>();
  for (const r of (progressAllRes.data ?? []) as Array<{
    student_id: string;
    started_at: string;
    completed_at: string;
  }>) {
    const startMs = new Date(r.started_at).getTime();
    const endMs = new Date(r.completed_at).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    // Clamp the delta: a malformed row with completed_at before
    // started_at (or days-long gaps from the seed's cluster logic)
    // shouldn't poison the total. 0 < delta ≤ 120 min per lesson.
    const deltaMin = Math.max(0, Math.min(120, (endMs - startMs) / 60_000));
    studentMinutes.set(
      r.student_id,
      (studentMinutes.get(r.student_id) ?? 0) + deltaMin,
    );
    studentLessons.set(
      r.student_id,
      (studentLessons.get(r.student_id) ?? 0) + 1,
    );
  }

  // Teacher active-day signal: union distinct (teacher_id, YYYY-MM-DD)
  // keys across every authored row type.
  const teacherDays = new Map<string, Set<string>>();
  function addTeacherDay(teacherId: string | null, iso: string | null) {
    if (!teacherId || !iso) return;
    const day = iso.slice(0, 10);
    let s = teacherDays.get(teacherId);
    if (!s) {
      s = new Set();
      teacherDays.set(teacherId, s);
    }
    s.add(day);
  }
  for (const r of (assignmentsAllRes.data ?? []) as Array<{
    assigned_by: string | null;
    assigned_at: string | null;
  }>) {
    addTeacherDay(r.assigned_by, r.assigned_at);
  }
  for (const r of (diaryRes.data ?? []) as Array<{
    teacher_id: string | null;
    created_at: string | null;
  }>) {
    addTeacherDay(r.teacher_id, r.created_at);
  }
  for (const r of (historyRes.data ?? []) as Array<{
    teacher_id: string | null;
    created_at: string | null;
  }>) {
    addTeacherDay(r.teacher_id, r.created_at);
  }

  const teacherTimeRows = teachers
    .map((t) => {
      const days = teacherDays.get(t.id)?.size ?? 0;
      return {
        id: t.id,
        name: t.full_name,
        activeDays: days,
        minutes: days * 15,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  const studentTimeRows = students
    .map((p) => {
      const minutes = Math.round(studentMinutes.get(p.id) ?? 0);
      const lessons = studentLessons.get(p.id) ?? 0;
      const r = rosterByAuthUser.get(p.id);
      const teacherName = r?.teacher_id
        ? teacherNameById.get(r.teacher_id) ?? null
        : null;
      return {
        id: p.id,
        displayName: p.full_name,
        teacherName,
        minutes,
        lessons,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  // Health signals
  const accountsWithoutAvatar = profiles.filter((p) => !p.avatar_url).length;
  const classroomsWithoutStudents =
    classrooms.length -
    new Set(members.map((m) => m.classroom_id)).size;
  const rosterWithoutAuthUser = roster.filter((r) => !r.auth_user_id).length;
  // Storage bytes — list prefix "avatars" is expensive to iterate server side;
  // we skip the exact byte count and just report object count via list().
  let storageAvatarCount = 0;
  const storageAvatarBytes = 0;
  try {
    const { data: list } = await admin.storage
      .from("avatars")
      .list("", { limit: 1000 });
    storageAvatarCount = list?.length ?? 0;
  } catch {
    /* no-op */
  }

  return {
    kpis: {
      teachers: teachers.length,
      students: students.length,
      classrooms: classrooms.filter((c) =>
        teachers.some((t) => t.id === c.teacher_id),
      ).length,
      rosterEntries: roster.filter((r) =>
        teachers.some((t) => t.id === r.teacher_id),
      ).length,
      demoAccounts: demoCount,
      publishedLessons,
      draftLessons,
      catalogLessons,
      catalogSongs,
      dau,
      wau,
      mau,
      newAccountsThisMonth,
      newAccountsLast30d,
      lessonsCompletedLast30d,
      lessonsAssignedLast30d,
      xpLast30d,
      aiMessagesLast30d,
      conversationsLast30d: realConversationsCount,
      activeTuitionSeats: roster
        .filter((r) => teachers.some((t) => t.id === r.teacher_id))
        .filter((r) => r.monthly_tuition_cents).length,
      paidInvoicesThisMonth,
      pendingInvoicesThisMonth,
    },
    growth,
    engagement,
    levelMix,
    topTeachers,
    allTeachers,
    topActiveStudents,
    allTimeTopStudents,
    timeOnSite: {
      teachers: teacherTimeRows,
      students: studentTimeRows,
    },
    contentMix: { lessonsPerCefr, songsPerCefr },
    health: {
      storageAvatarBytes,
      storageAvatarCount,
      accountsWithoutAvatar,
      classroomsWithoutStudents,
      rosterWithoutAuthUser,
    },
  };
}

function getMonday(d: Date): string {
  const copy = new Date(d);
  const dow = copy.getUTCDay();
  const diff = (dow + 6) % 7; // Monday = 0
  copy.setUTCDate(copy.getUTCDate() - diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}
