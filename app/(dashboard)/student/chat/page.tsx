import { createClient } from "@/lib/supabase/server";
import { getAiProviderInfo } from "@/lib/ai/provider-info";
import { ChatInterface } from "@/components/chat/chat-interface";
import { T } from "@/components/reports/t";

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
    // classroom_id on conversations is nullable (migration 037) —
    // the tutor isn't tied to any classroom. We still best-effort
    // attach one if the caller happens to be a member of (or own)
    // a classroom, purely for context. Null is fine when not.
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

    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        student_id: user.id,
        classroom_id: classroomId,
      })
      .select("id")
      .single();
    if (convErr) console.error("[chat] conversation insert failed", convErr);
    conversation = newConv;
  }

  const ai = getAiProviderInfo();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold">
          <T en="AI English Tutor" pt="Tutor de Inglês com IA" />
        </h1>
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
