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
      "id, full_name, preferred_name, birthday, age_group, gender, classroom_id, has_avatar"
    )
    .eq("teacher_id", user.id)
    .not("birthday", "is", null);

  if (error || !data) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  const withAvatars = data.filter(
    (r) => (r as { has_avatar: boolean }).has_avatar
  );
  const signed = await getRosterAvatarSignedUrls(
    withAvatars.map((r) => r.id as string)
  );

  const upcoming: UpcomingBirthday[] = [];
  for (const row of data) {
    const birthdayStr = row.birthday as string;
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

    upcoming.push({
      id: row.id as string,
      fullName: row.full_name as string,
      preferredName: (row as { preferred_name: string | null }).preferred_name,
      ageGroup: (row as { age_group: UpcomingBirthday["ageGroup"] }).age_group ?? null,
      gender: (row as { gender: UpcomingBirthday["gender"] }).gender ?? null,
      classroomId: (row as { classroom_id: string | null }).classroom_id,
      hasAvatar: (row as { has_avatar: boolean }).has_avatar,
      avatarUrl: signed[row.id as string] ?? null,
      birthday: birthdayStr,
      daysUntil: diffDays,
      nextBirthdayDate: next.toISOString().slice(0, 10),
      turningAge: turningAge && turningAge > 0 ? turningAge : null,
    });
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming;
}
