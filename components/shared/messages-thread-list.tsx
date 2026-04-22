"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, X, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  approveReviewThread,
  approveSuggestedUpdate,
  rejectReviewThread,
  replyInThread,
} from "@/lib/actions/sysadmin-messages";
import type { SysadminMessageWithMeta } from "@/lib/actions/sysadmin-messages";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  messages: SysadminMessageWithMeta[];
  myId: string;
  isOwner: boolean;
}

// Group messages into threads and sort each thread oldest → newest.
// Thread list is sorted by the most-recent message across all threads.
function groupThreads(
  messages: SysadminMessageWithMeta[],
): Array<{ threadId: string; rows: SysadminMessageWithMeta[] }> {
  const map = new Map<string, SysadminMessageWithMeta[]>();
  for (const m of messages) {
    const existing = map.get(m.thread_id);
    if (existing) existing.push(m);
    else map.set(m.thread_id, [m]);
  }
  const arr = Array.from(map.entries()).map(([threadId, rows]) => ({
    threadId,
    rows: rows.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }));
  arr.sort(
    (a, b) =>
      new Date(b.rows[b.rows.length - 1].created_at).getTime() -
      new Date(a.rows[a.rows.length - 1].created_at).getTime(),
  );
  return arr;
}

export function MessagesThreadList({ messages, myId, isOwner }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const router = useRouter();
  const threads = useMemo(() => groupThreads(messages), [messages]);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submitReply(threadId: string) {
    if (!replyBody.trim()) return;
    startTransition(async () => {
      const r = await replyInThread({ thread_id: threadId, body: replyBody });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Resposta enviada." : "Reply sent.");
      setReplyBody("");
      router.refresh();
    });
  }

  function approveReview(threadId: string) {
    startTransition(async () => {
      const r = await approveReviewThread(threadId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Marcado como feito." : "Marked as done.");
      router.refresh();
    });
  }

  function rejectReview(threadId: string) {
    const body = prompt(
      pt
        ? "Explique por que você discorda:"
        : "Explain why you disagree:",
    );
    if (!body?.trim()) return;
    startTransition(async () => {
      const r = await rejectReviewThread({ thread_id: threadId, body });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Resposta enviada." : "Reply sent.");
      router.refresh();
    });
  }

  function approveSuggestion(threadId: string) {
    startTransition(async () => {
      const r = await approveSuggestedUpdate(threadId);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt
          ? "Sugestão aprovada. Autor notificado."
          : "Suggestion approved. Author notified.",
      );
      router.refresh();
    });
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          {pt ? "Sem mensagens ainda." : "No messages yet."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {threads.map(({ threadId, rows }) => {
        const head = rows[0];
        const last = rows[rows.length - 1];
        const status = last.status;
        const isReviewFromSysadmin =
          head.sender_role === "owner" &&
          !head.is_reply &&
          !(head.subject ?? "").toLowerCase().startsWith("update request");
        const isUpdateRequest =
          head.sender_role === "teacher" &&
          (head.subject ?? "").toLowerCase().startsWith("update request");
        const iAmRecipientOfHead = head.recipient_id === myId;
        const open = openThread === threadId;
        return (
          <li
            key={threadId}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {head.sender_role} · {head.sender_name ?? head.sender_email ?? "—"}
                  {" → "}
                  {head.recipient_name ?? "—"}
                </p>
                {head.subject ? (
                  <p className="truncate text-base font-semibold">
                    {head.subject}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(head.created_at).toLocaleString()}
                  {rows.length > 1 ? (
                    <>
                      {" · "}
                      {rows.length} {pt ? "msgs" : "msgs"}
                    </>
                  ) : null}
                </p>
              </div>
              <Badge
                variant={
                  status === "approved"
                    ? "default"
                    : status === "rejected"
                      ? "destructive"
                      : "outline"
                }
                className="text-[10px]"
              >
                {status}
              </Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{head.body}</p>
            {head.bank_entry_title ? (
              <p className="mt-1 text-xs italic text-muted-foreground">
                {pt ? "Sobre a lição:" : "About lesson:"}{" "}
                <span className="font-medium">{head.bank_entry_title}</span>
              </p>
            ) : null}
            {rows.length > 1 ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setOpenThread(open ? null : threadId)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  {open
                    ? pt
                      ? "Fechar conversa"
                      : "Close thread"
                    : pt
                      ? "Abrir conversa completa"
                      : "Open full thread"}
                </button>
                {open ? (
                  <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
                    {rows.slice(1).map((r) => (
                      <li key={r.id} className="text-xs">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {r.sender_role} · {new Date(r.created_at).toLocaleString()}
                        </p>
                        <p className="whitespace-pre-wrap">{r.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {status === "pending" && isReviewFromSysadmin && iAmRecipientOfHead ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => approveReview(threadId)}
                    disabled={pending}
                    className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {pt ? "Feito" : "Done"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectReview(threadId)}
                    disabled={pending}
                    className="h-7 gap-1.5 border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    {pt ? "Discordo" : "Disagree"}
                  </Button>
                </>
              ) : null}
              {status === "pending" && isOwner && isUpdateRequest ? (
                <Button
                  size="sm"
                  onClick={() => approveSuggestion(threadId)}
                  disabled={pending}
                  className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  {pt ? "Aprovar sugestão" : "Approve suggestion"}
                </Button>
              ) : null}
              <div className="ml-auto flex items-center gap-2">
                <input
                  value={openThread === threadId ? replyBody : ""}
                  onChange={(e) => {
                    setOpenThread(threadId);
                    setReplyBody(e.target.value);
                  }}
                  placeholder={pt ? "Responder…" : "Reply…"}
                  className="h-7 w-52 rounded-md border border-border bg-background px-2 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitReply(threadId)}
                  disabled={pending || openThread !== threadId || !replyBody.trim()}
                  className="h-7 gap-1.5 text-[11px]"
                >
                  <Send className="h-3 w-3" />
                  {pt ? "Enviar" : "Send"}
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
