import { createClient } from "@/lib/supabase/server";
import { getAiProviderInfo } from "@/lib/ai/provider-info";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function TeacherChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const ai = getAiProviderInfo();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold">AI Tutor</h1>
        <span className="text-xs font-medium text-muted-foreground">
          · {ai.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Use as a lesson-planning assistant, quick translator, or general
        sounding board. Switch to Open chat for unrestricted conversation.
      </p>
      <ChatInterface
        conversationId=""
        remainingMessages={9999}
        aiLabel={ai.label}
      />
    </div>
  );
}
