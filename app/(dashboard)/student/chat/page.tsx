import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { remaining } = await checkRateLimit(supabase, user.id);

  // Get or create a conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    // Get student's first classroom
    const { data: membership } = await supabase
      .from("classroom_members")
      .select("classroom_id")
      .eq("student_id", user.id)
      .limit(1)
      .single();

    if (membership) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          student_id: user.id,
          classroom_id: membership.classroom_id,
        })
        .select("id")
        .single();
      conversation = newConv;
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI English Tutor</h1>
      <ChatInterface
        conversationId={conversation?.id ?? ""}
        remainingMessages={remaining}
      />
    </div>
  );
}
