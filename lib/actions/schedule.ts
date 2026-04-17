"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UuidSchema = z.string().uuid();
const StatusSchema = z.enum(["held", "cancelled", "rescheduled"]).nullable();

const LogSchema = z.object({
  classId: UuidSchema,
  observations: z.string().max(8000).nullable().optional(),
  completionStatus: StatusSchema.optional(),
});

export async function updateClassLog(input: z.input<typeof LogSchema>) {
  const parsed = LogSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.observations !== undefined) patch.observations = parsed.data.observations;
  if (parsed.data.completionStatus !== undefined) patch.completion_status = parsed.data.completionStatus;

  const { data: row, error } = await supabase
    .from("scheduled_classes")
    .update(patch)
    .eq("id", parsed.data.classId)
    .eq("created_by", user.id)
    .select("classroom_id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (row?.classroom_id) {
    revalidatePath(`/teacher/classroom/${row.classroom_id}`);
  }
  return { success: true as const };
}

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
