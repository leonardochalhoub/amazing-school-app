"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const LocationSchema = z.object({
  location: z
    .string()
    .trim()
    .max(80, "Location must be 80 characters or fewer")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function updateMyLocation(
  input: z.input<typeof LocationSchema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = LocationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({ location: parsed.data.location })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/student/profile");
  revalidatePath("/teacher");
  return { success: true };
}
