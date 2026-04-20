import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { getAiProviderInfo } from "./provider-info";

/**
 * One-shot pt-BR → en translator used when we persist English
 * copies of certificate free-text (remarks, teacher_title) at
 * creation time. Best-effort: returns null on any failure so the
 * insert still succeeds and the render falls back to the PT copy.
 *
 * Same provider selection rules as the chat route — Groq / Google
 * / Anthropic, picked from env.
 */
export async function translatePtToEn(
  text: string | null | undefined,
): Promise<string | null> {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  const info = getAiProviderInfo();
  if (info.provider === "none") return null;

  const model =
    info.provider === "groq"
      ? groq(info.model)
      : info.provider === "google"
        ? google(info.model)
        : anthropic(info.model);

  try {
    const { text: out } = await generateText({
      model,
      system:
        "You translate short Brazilian-Portuguese strings into natural US English for official school certificates. Preserve academic titles and degree names (e.g. 'Pós-Graduação' → 'Postgraduate Certificate'). Return the translation and nothing else — no quotes, no commentary, no trailing punctuation the original didn't have.",
      prompt: trimmed,
      // Leave temperature default (no creative rewriting). Short
      // strings so we cap at a tight max-tokens budget.
      maxOutputTokens: 220,
    });
    const cleaned = out.trim();
    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}
