import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { checkAndIncrement } from "@/lib/ai/rate-limit";

/**
 * Picks the chat model based on which API key is configured.
 *
 *   GOOGLE_GENERATIVE_AI_API_KEY → Gemini (free tier: 15 RPM / 1500 RPD)
 *   ANTHROPIC_API_KEY             → Claude (pay-per-use)
 *
 * Gemini wins when both are set because it's free. Users can force a
 * specific provider with AI_PROVIDER=google | anthropic.
 */
function pickModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER;
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  const useGoogle =
    provider === "google" || (provider == null && hasGoogle) || (!hasAnthropic && hasGoogle);

  if (useGoogle) {
    return google(process.env.AI_MODEL ?? "gemini-2.0-flash-exp");
  }
  return anthropic(process.env.AI_MODEL ?? "claude-haiku-4-5-20251001");
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  if (
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    return Response.json(
      {
        error:
          "AI tutor not configured. Set GOOGLE_GENERATIVE_AI_API_KEY (free at aistudio.google.com/apikey) or ANTHROPIC_API_KEY.",
      },
      { status: 503 }
    );
  }

  const { allowed, remaining } = await checkAndIncrement(supabase, user.id);
  if (!allowed) {
    return Response.json(
      { error: "Daily message limit reached", remaining: 0 },
      { status: 429 }
    );
  }

  const { messages, conversationId } = await req.json();

  const result = streamText({
    model: pickModel(),
    system: SYSTEM_PROMPT,
    messages,
    onFinish: async ({ text }) => {
      if (conversationId) {
        const userMessage = messages[messages.length - 1];
        await supabase.from("messages").insert([
          {
            conversation_id: conversationId,
            role: "user",
            content: userMessage.content,
          },
          { conversation_id: conversationId, role: "assistant", content: text },
        ]);

        await supabase.from("daily_activity").upsert(
          {
            student_id: user.id,
            activity_date: new Date().toISOString().split("T")[0],
            lesson_count: 0,
            chat_messages: 1,
          },
          { onConflict: "student_id,activity_date" }
        );
      }
    },
  });

  return result.toTextStreamResponse({
    headers: { "X-Remaining-Messages": String(remaining) },
  });
}
