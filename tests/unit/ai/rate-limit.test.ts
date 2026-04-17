import { describe, expect, it } from "vitest";
import { getDailyLimit } from "@/lib/ai/rate-limit";

describe("getDailyLimit", () => {
  it("uses env var when set to a positive integer", () => {
    const prev = process.env.AI_DAILY_MESSAGE_LIMIT;
    process.env.AI_DAILY_MESSAGE_LIMIT = "42";
    expect(getDailyLimit()).toBe(42);
    process.env.AI_DAILY_MESSAGE_LIMIT = prev;
  });

  it("falls back to default when env is missing or invalid", () => {
    const prev = process.env.AI_DAILY_MESSAGE_LIMIT;
    delete process.env.AI_DAILY_MESSAGE_LIMIT;
    expect(getDailyLimit()).toBe(20);

    process.env.AI_DAILY_MESSAGE_LIMIT = "not-a-number";
    expect(getDailyLimit()).toBe(20);

    process.env.AI_DAILY_MESSAGE_LIMIT = "0";
    expect(getDailyLimit()).toBe(20);

    process.env.AI_DAILY_MESSAGE_LIMIT = prev;
  });
});
