"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { listMusic } from "@/lib/content/music";
import { getAllLessons } from "@/lib/content/loader";

export interface PublicStats {
  students: number;
  teachers: number;
  lessons: number;
  songs: number;
  classrooms: number;
}

/**
 * Counts shown on the public landing page. No PII, no per-user data —
 * just aggregate totals. Uses the admin client because we're reading
 * across all profiles regardless of RLS.
 */
export async function getPublicStats(): Promise<PublicStats> {
  const admin = createAdminClient();

  const [studentsRes, teachersRes, classroomsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher"),
    admin.from("classrooms").select("id", { count: "exact", head: true }),
  ]);

  return {
    students: studentsRes.count ?? 0,
    teachers: teachersRes.count ?? 0,
    lessons: getAllLessons().length,
    songs: listMusic().length,
    classrooms: classroomsRes.count ?? 0,
  };
}
