import { beforeAll } from "vitest";

beforeAll(() => {
  process.env.AI_DAILY_MESSAGE_LIMIT = process.env.AI_DAILY_MESSAGE_LIMIT ?? "20";
});
