"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRosterAvatarSignedUrls } from "@/lib/actions/roster";

export interface UpcomingBirthday {
  id: string;
  fullName: string;
  preferredName: string | null;
  ageGroup: "kid" | "teen" | "adult" | null;
  gender: "female" | "male" | null;
  classroomId: string | null;
  avatarUrl: string | null;
  hasAvatar: boolean;
  birthday: string;
  daysUntil: number;
  nextBirthdayDate: string;
  turningAge: number | null;
}

/**
 * Returns roster students with birthdays in the next N days (inclusive of today).
 * Computed on the server so the teacher sees a live count regardless of timezone skew.
 */
export async function getUpcomingBirthdays(
  windowDays = 14
): Promise<UpcomingBirthday[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("roster_students")
    .select(
      "id, full_name, preferred_name, email, birthday, age_group, gender, classroom_id, has_avatar, auth_user_id"
    )
    .eq("teacher_id", user.id)
    .not("birthday", "is", null);

  if (error || !data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  // Demo-exception: on the seeded demo teacher account, pin three
  // students' birthdays to nearby offsets from today so the "Upcoming
  // birthdays" panel is always populated regardless of when the visitor
  // lands. Ana always shows up first (tomorrow).
  const isDemoTeacher =
    (user.email ?? "").toLowerCase() === "demo.luiza@amazingschool.app";
  const demoBirthdayOffsetsByEmail: Record<string, number> = {
    "demo.ana@amazingschool.app": 1,
    "demo.gustavo@amazingschool.app": 5,
    "demo.mariana@amazingschool.app": 12,
  };
  const monthDayFromOffset = (days: number) => {
    const d = new Date(today.getTime() + days * 86_400_000);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Two avatar sources merged, same rule as elsewhere in the teacher UI:
  //   1. roster/{rosterId}.webp  → teacher-set photo (has_avatar=true)
  //   2. {authUserId}.webp       → student self-uploaded on /student/profile
  // Teacher-set wins when both exist; otherwise we fall back to the
  // student's own photo. RLS would block the SSR client from reading
  // profile avatars whose owners aren't in classroom_members, so we sign
  // those URLs with the admin client (the rows are already scoped by
  // teacher_id upstream).
  const withRosterAvatar = data.filter(
    (r) => (r as { has_avatar: boolean }).has_avatar
  );
  const rosterSigned = await getRosterAvatarSignedUrls(
    withRosterAvatar.map((r) => r.id as string)
  );
  const linkedAuthIds = data
    .map((r) => (r as { auth_user_id: string | null }).auth_user_id)
    .filter((x): x is string => !!x);
  const profileSigned: Record<string, string> = {};
  await Promise.all(
    linkedAuthIds.map(async (authId) => {
      const { data: signed } = await admin.storage
        .from("avatars")
        .createSignedUrl(`${authId}.webp`, 3600);
      if (signed?.signedUrl) profileSigned[authId] = signed.signedUrl;
    }),
  );

  const upcoming: UpcomingBirthday[] = [];
  for (const row of data) {
    let birthdayStr = row.birthday as string;
    const rowEmail = (row as { email: string | null }).email ?? "";
    if (isDemoTeacher) {
      const offset = demoBirthdayOffsetsByEmail[rowEmail.toLowerCase()];
      if (typeof offset === "number") {
        birthdayStr = `${birthdayStr.slice(0, 4)}-${monthDayFromOffset(offset)}`;
      }
    }
    const birthDate = new Date(birthdayStr);
    if (Number.isNaN(birthDate.getTime())) continue;

    const month = birthDate.getMonth();
    const day = birthDate.getDate();

    // Next occurrence of their birthday
    const next = new Date(year, month, day);
    next.setHours(0, 0, 0, 0);
    if (next < today) next.setFullYear(year + 1);

    const diffDays = Math.round(
      (next.getTime() - today.getTime()) / 86_400_000
    );

    if (diffDays > windowDays) continue;

    const turningAge = Number.isFinite(birthDate.getFullYear())
      ? next.getFullYear() - birthDate.getFullYear()
      : null;

    const rosterUrl = rosterSigned[row.id as string];
    const authId = (row as { auth_user_id: string | null }).auth_user_id;
    const selfUrl = authId ? profileSigned[authId] : undefined;
    const avatarUrl = rosterUrl ?? selfUrl ?? null;
    upcoming.push({
      id: row.id as string,
      fullName: row.full_name as string,
      preferredName: (row as { preferred_name: string | null }).preferred_name,
      ageGroup: (row as { age_group: UpcomingBirthday["ageGroup"] }).age_group ?? null,
      gender: (row as { gender: UpcomingBirthday["gender"] }).gender ?? null,
      classroomId: (row as { classroom_id: string | null }).classroom_id,
      hasAvatar:
        (row as { has_avatar: boolean }).has_avatar || !!selfUrl,
      avatarUrl,
      birthday: birthdayStr,
      daysUntil: diffDays,
      nextBirthdayDate: next.toISOString().slice(0, 10),
      turningAge: turningAge && turningAge > 0 ? turningAge : null,
    });
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming;
}
