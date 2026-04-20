import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { streamText, type LanguageModel } from "ai";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT, OPEN_CHAT_PROMPT } from "@/lib/ai/system-prompt";

/**
 * Picks the chat model based on which API key is configured. Priority:
 *
 *   1. AI_PROVIDER env var if set (groq | google | anthropic)
 *   2. Groq if GROQ_API_KEY set (free tier, fast, llama-3.3)
 *   3. Gemini if GOOGLE_GENERATIVE_AI_API_KEY set (free tier, 15 RPM)
 *   4. Claude if ANTHROPIC_API_KEY set (pay-per-use)
 */
function pickModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (provider === "groq" || (!provider && hasGroq)) {
    return groq(process.env.AI_MODEL ?? "llama-3.3-70b-versatile");
  }
  if (provider === "google" || (!provider && hasGoogle)) {
    return google(process.env.AI_MODEL ?? "gemini-2.0-flash");
  }
  if (provider === "anthropic" || hasAnthropic) {
    return anthropic(process.env.AI_MODEL ?? "claude-haiku-4-5-20251001");
  }
  // Sensible default — falls back to Groq if nothing is configured.
  return groq("llama-3.3-70b-versatile");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  if (
    !process.env.GROQ_API_KEY &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    return Response.json(
      {
        error:
          "AI tutor not configured. Set GROQ_API_KEY (free at console.groq.com), GOOGLE_GENERATIVE_AI_API_KEY, or ANTHROPIC_API_KEY.",
      },
      { status: 503 }
    );
  }

  // Rate limit disabled — Groq's free tier is generous enough that we can
  // let students chat freely. Re-enable by restoring checkAndIncrement and
  // gating the response on `allowed`.
  const remaining = 9999;

  const { messages, conversationId, mode } = await req.json();
  const systemPrompt = mode === "open" ? OPEN_CHAT_PROMPT : SYSTEM_PROMPT;

  // Pre-flight: ask the model for a one-token reply so we can surface
  // auth/quota errors as a proper 502/429 instead of a silent empty stream.
  try {
    const result = streamText({
      model: pickModel(),
      system: systemPrompt,
      messages,
      onError: ({ error }) => {
        console.error("[ai chat] streamText error:", error);
      },
      onFinish: async ({ text }) => {
        if (!conversationId) {
          console.warn("[ai chat] no conversationId — messages not stored");
          return;
        }
        if (!text) {
          console.warn("[ai chat] empty model reply — messages not stored");
          return;
        }
        const userMessage = messages[messages.length - 1];
        const { error: msgErr } = await supabase
          .from("messages")
          .insert([
            {
              conversation_id: conversationId,
              role: "user",
              content: userMessage.content,
            },
            {
              conversation_id: conversationId,
              role: "assistant",
              content: text,
            },
          ]);
        if (msgErr) {
          console.error("[ai chat] messages insert failed", msgErr);
        }

        const { error: actErr } = await supabase
          .from("daily_activity")
          .upsert(
            {
              student_id: user.id,
              activity_date: new Date().toISOString().split("T")[0],
              lesson_count: 0,
              chat_messages: 1,
            },
            { onConflict: "student_id,activity_date" }
          );
        if (actErr) {
          console.error("[ai chat] daily_activity upsert failed", actErr);
        }
      },
    });

    return result.toTextStreamResponse({
      headers: { "X-Remaining-Messages": String(remaining) },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai chat] sync error:", msg);
    return Response.json({ error: `AI tutor error: ${msg}` }, { status: 502 });
  }
}
