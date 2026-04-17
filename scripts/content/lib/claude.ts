import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { BUDGET } from "../config";
import { CostTracker } from "./cost-tracker";

export interface CallOptions {
  model: string;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
  tracker: CostTracker;
  maxRetries?: number;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callClaude(opts: CallOptions): Promise<string> {
  const maxRetries = opts.maxRetries ?? BUDGET.maxRetries;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateText({
        model: anthropic(opts.model),
        system: opts.system,
        prompt: opts.prompt,
        maxOutputTokens: opts.maxOutputTokens ?? 4000,
      });
      const usage = result.usage ?? {
        promptTokens: 0,
        completionTokens: 0,
      };
      const inputTokens =
        (usage as { inputTokens?: number }).inputTokens ??
        (usage as { promptTokens?: number }).promptTokens ??
        0;
      const outputTokens =
        (usage as { outputTokens?: number }).outputTokens ??
        (usage as { completionTokens?: number }).completionTokens ??
        0;
      opts.tracker.record(opts.model, inputTokens, outputTokens);
      return result.text;
    } catch (err) {
      lastErr = err;
      const wait = Math.min(30_000, 1000 * 2 ** attempt);
      await sleep(wait);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
