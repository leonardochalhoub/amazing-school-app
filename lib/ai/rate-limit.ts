import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_DAILY_LIMIT = 20;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function getDailyLimit(): number {
  const raw = process.env.AI_DAILY_MESSAGE_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkAndIncrement(
  supabase: SupabaseClient,
  userId: string
): Promise<RateLimitResult> {
  const limit = getDailyLimit();
  const { data, error } = await supabase.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_window_date: todayUtc(),
    p_limit: limit,
  });

  if (error || !data) {
    return { allowed: false, remaining: 0 };
  }

  const payload = data as { allowed?: boolean; remaining?: number };
  return {
    allowed: Boolean(payload.allowed),
    remaining: Math.max(0, Number(payload.remaining ?? 0)),
  };
}

export async function peekRemaining(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const limit = getDailyLimit();
  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("window_date", todayUtc())
    .maybeSingle();
  const used = data?.count ?? 0;
  return Math.max(0, limit - used);
}
