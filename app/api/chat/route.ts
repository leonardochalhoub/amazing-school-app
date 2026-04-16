import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { checkRateLimit } from "@/lib/ai/rate-limit";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { allowed, remaining } = await checkRateLimit(supabase, user.id);
  if (!allowed) {
    return Response.json(
      { error: "Daily message limit reached", remaining: 0 },
      { status: 429 }
    );
  }

  const { messages, conversationId } = await req.json();

  const model = process.env.AI_MODEL ?? "claude-haiku-4-5-20251001";

  const result = streamText({
    model: anthropic(model),
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
          {
            conversation_id: conversationId,
            role: "assistant",
            content: text,
          },
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
    headers: { "X-Remaining-Messages": String(remaining - 1) },
  });
}
