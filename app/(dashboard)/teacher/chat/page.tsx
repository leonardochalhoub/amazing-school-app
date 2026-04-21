import { createClient } from "@/lib/supabase/server";
import { getAiProviderInfo } from "@/lib/ai/provider-info";
import { ChatInterface } from "@/components/chat/chat-interface";
import { T } from "@/components/reports/t";

export default async function TeacherChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Reuse the most recent conversation if the teacher has one,
  // otherwise create a fresh row. Mirrors /student/chat — without
  // a real conversationId the /api/chat onFinish hook silently
  // drops every message, which is why the sysadmin AI-tutor
  // usage table read empty for teachers even after they chatted.
  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    // Best-effort classroom anchor. classroom_id is nullable now
    // (migration 037), so null is fine when the teacher doesn't
    // own any classroom yet.
    let classroomId: string | null = null;
    const { data: owned } = await supabase
      .from("classrooms")
      .select("id")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (owned) classroomId = (owned as { id: string }).id;

    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        student_id: user.id,
        classroom_id: classroomId,
      })
      .select("id")
      .single();
    if (convErr) console.error("[teacher chat] conv insert failed", convErr);
    conversation = newConv;
  }

  const ai = getAiProviderInfo();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold">
          <T en="AI Tutor" pt="Tutor de IA" />
        </h1>
        <span className="text-xs font-medium text-muted-foreground">
          · {ai.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        <T
          en="Use as a lesson-planning assistant, quick translator, or general sounding board. Switch to Open chat for unrestricted conversation."
          pt="Use como assistente de planejamento de aulas, tradutor rápido ou um espaço para pensar em voz alta. Mude para o chat aberto para conversas sem restrições."
        />
      </p>
      <ChatInterface
        conversationId={conversation?.id ?? ""}
        remainingMessages={9999}
        aiLabel={ai.label}
      />
    </div>
  );
}
