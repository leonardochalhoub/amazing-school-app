import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_DAILY_LIMIT = 20;

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = parseInt(
    process.env.AI_DAILY_MESSAGE_LIMIT ?? String(DEFAULT_DAILY_LIMIT),
    10
  );

  const today = new Date().toISOString().split("T")[0];

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", `${today}T00:00:00`)
    .in(
      "conversation_id",
      (
        await supabase
          .from("conversations")
          .select("id")
          .eq("student_id", userId)
      ).data?.map((c) => c.id) ?? []
    );

  const used = count ?? 0;
  const remaining = Math.max(0, limit - used);

  return { allowed: remaining > 0, remaining };
}
