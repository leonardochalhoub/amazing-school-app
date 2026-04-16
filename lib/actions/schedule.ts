"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createScheduledClass(
  classroomId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const title = formData.get("title") as string;
  const meetingUrl = formData.get("meetingUrl") as string;
  const scheduledAt = formData.get("scheduledAt") as string;

  const { error } = await supabase.from("scheduled_classes").insert({
    classroom_id: classroomId,
    title,
    meeting_url: meetingUrl,
    scheduled_at: scheduledAt,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/teacher/classroom/${classroomId}`);
  return { success: true };
}

export async function getUpcomingClasses(classroomId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("scheduled_classes")
    .select("*")
    .eq("classroom_id", classroomId)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  return data ?? [];
}

export async function getPastClasses(classroomId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("scheduled_classes")
    .select("*")
    .eq("classroom_id", classroomId)
    .lt("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: false })
    .limit(10);

  return data ?? [];
}

export async function deleteScheduledClass(classId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_classes")
    .delete()
    .eq("id", classId);

  if (error) return { error: error.message };
  return { success: true };
}
