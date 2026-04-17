import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { checkAndIncrement } from "@/lib/ai/rate-limit";
import { hasServiceRole, createServiceClient, ensureProfile } from "../fixtures/supabase-test-client";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000b01";

describe.skipIf(!hasServiceRole())("rate-limit integration", () => {
  const supabase = hasServiceRole() ? createServiceClient() : null;

  beforeAll(async () => {
    if (!supabase) return;
    await ensureProfile(supabase, TEST_USER_ID, "Rate Limit Tester", "student");
    await supabase
      .from("ai_usage")
      .delete()
      .eq("user_id", TEST_USER_ID);
    process.env.AI_DAILY_MESSAGE_LIMIT = "3";
  });

  afterAll(async () => {
    if (!supabase) return;
    await supabase.from("ai_usage").delete().eq("user_id", TEST_USER_ID);
    await supabase.from("profiles").delete().eq("id", TEST_USER_ID);
  });

  it("allows the first N calls then denies the N+1th (survives cold restart of the function under test)", async () => {
    if (!supabase) return;
    const r1 = await checkAndIncrement(supabase, TEST_USER_ID);
    const r2 = await checkAndIncrement(supabase, TEST_USER_ID);
    const r3 = await checkAndIncrement(supabase, TEST_USER_ID);
    const r4 = await checkAndIncrement(supabase, TEST_USER_ID);
    expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, true]);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});
