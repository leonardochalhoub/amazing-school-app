"use server";

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { getAiProviderInfo } from "./provider-info";

/**
 * Free-form English → Brazilian Portuguese translator used by the
 * Speaking Lab "say + translate" widget. Provider is whichever of
 * Groq / Google / Anthropic is configured — the env's free Groq tier
 * comes first when its key is present, so users don't burn paid
 * credits on a translation aid.
 */
export async function translateEnToPt(
  text: string,
): Promise<{ translation: string; provider: string } | { error: string }> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { error: "empty input" };
  if (trimmed.length > 2000) return { error: "too long (max 2000 chars)" };

  const info = getAiProviderInfo();
  if (info.provider === "none") {
    return { error: "no AI provider configured" };
  }

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
        "You are a professional English-to-Brazilian-Portuguese translator. Render the input naturally for a Brazilian student. Keep the same tone (casual stays casual, formal stays formal). Translate the whole input. Output only the translation — no quotes, no notes, no labels, no greeting.",
      prompt: trimmed,
      maxOutputTokens: 800,
    });
    const cleaned = out.trim();
    if (!cleaned) return { error: "empty translation" };
    return { translation: cleaned, provider: info.provider };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "translation failed" };
  }
}
