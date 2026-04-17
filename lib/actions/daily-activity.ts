"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Upsert today's daily_activity row for the signed-in student. Called once
 * per page view on /student to drive the daily streak counter. The table has
 * a unique (student_id, activity_date) constraint so duplicate calls are
 * idempotent.
 */
export async function touchDailyActivity(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  await supabase
    .from("daily_activity")
    .upsert(
      { student_id: user.id, activity_date: today },
      { onConflict: "student_id,activity_date" }
    );
}
