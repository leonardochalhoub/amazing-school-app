import { createClient } from "@/lib/supabase/server";
import { getAiProviderInfo } from "@/lib/ai/provider-info";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const remaining = 9999;

  // Get or create a conversation
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    // Resolve the classroom_id that anchors the conversation row.
    // Classrooms are NOT semantically linked to the AI tutor — this
    // is only here because the conversations table's NOT NULL
    // constraint requires a value. Students pick it up from their
    // classroom_members row; teachers / owners fall back to the
    // first classroom they own (classrooms.teacher_id = auth.uid()).
    let classroomId: string | null = null;
    const { data: membership } = await supabase
      .from("classroom_members")
      .select("classroom_id")
      .eq("student_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membership) {
      classroomId = (membership as { classroom_id: string }).classroom_id;
    } else {
      const { data: owned } = await supabase
        .from("classrooms")
        .select("id")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (owned) classroomId = (owned as { id: string }).id;
    }

    if (classroomId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          student_id: user.id,
          classroom_id: classroomId,
        })
        .select("id")
        .single();
      conversation = newConv;
    }
  }

  const ai = getAiProviderInfo();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold">AI English Tutor</h1>
        <span className="text-xs font-medium text-muted-foreground">
          · {ai.label}
        </span>
      </div>
      <ChatInterface
        conversationId={conversation?.id ?? ""}
        remainingMessages={remaining}
        aiLabel={ai.label}
      />
    </div>
  );
}
