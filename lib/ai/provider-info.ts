/**
 * Describes which AI provider/model is currently wired up. Pure env read —
 * no network calls. Kept in sync with pickModel() in app/api/chat/route.ts.
 */
export interface AiProviderInfo {
  provider: "groq" | "google" | "anthropic" | "none";
  model: string;
  label: string;
}

export function getAiProviderInfo(): AiProviderInfo {
  const explicit = process.env.AI_PROVIDER;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const modelEnv = process.env.AI_MODEL;

  let provider: AiProviderInfo["provider"] = "none";
  let model = "";

  if (explicit === "groq" || (!explicit && hasGroq)) {
    provider = "groq";
    model = modelEnv ?? "llama-3.3-70b-versatile";
  } else if (explicit === "google" || (!explicit && hasGoogle)) {
    provider = "google";
    model = modelEnv ?? "gemini-2.0-flash";
  } else if (explicit === "anthropic" || hasAnthropic) {
    provider = "anthropic";
    model = modelEnv ?? "claude-haiku-4-5-20251001";
  }

  const providerLabel =
    provider === "groq"
      ? "Groq"
      : provider === "google"
        ? "Google Gemini"
        : provider === "anthropic"
          ? "Anthropic Claude"
          : "not configured";

  return {
    provider,
    model,
    label: provider === "none" ? providerLabel : `${providerLabel} · ${model}`,
  };
}
