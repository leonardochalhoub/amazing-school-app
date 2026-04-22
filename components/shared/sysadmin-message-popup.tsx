"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  approveReviewThread,
  markThreadRead,
  rejectReviewThread,
  approveSuggestedUpdate,
  rejectSuggestedUpdate,
} from "@/lib/actions/sysadmin-messages";
import type { SysadminMessageWithMeta } from "@/lib/actions/sysadmin-messages";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  unreadMessages: SysadminMessageWithMeta[];
  isOwner: boolean;
  messagesHref: string;
}

/**
 * Pops up a floating card whenever the user has unread inbox
 * messages. Teacher gets green-check / red-X review controls on
 * sysadmin reviews. Sysadmin gets an "Approve" action on update
 * requests. Dismiss marks the thread read without status change.
 */
export function SysadminMessagePopup({
  unreadMessages,
  isOwner,
  messagesHref,
}: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [rejectingFor, setRejectingFor] = useState<string | null>(null);
  const [rejectBody, setRejectBody] = useState("");
  const [pending, startTransition] = useTransition();

  const visible = unreadMessages.filter((m) => !dismissed.has(m.thread_id));
  const head = visible[0];

  if (!head) return null;

  // rejectingFor is thread-scoped — a stale value from a previous head
  // simply won't match head.thread_id, so the reject UI is naturally
  // hidden. No useEffect-driven reset needed.
  const rejectingThis = rejectingFor === head.thread_id;

  function close() {
    if (!head) return;
    startTransition(async () => {
      await markThreadRead(head.thread_id);
      setDismissed((s) => {
        const next = new Set(s);
        next.add(head.thread_id);
        return next;
      });
      router.refresh();
    });
  }

  function approve() {
    if (!head) return;
    startTransition(async () => {
      // Non-owner teacher approving a sysadmin review.
      const r = await approveReviewThread(head.thread_id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Marcado como OK." : "Marked as OK.");
      await markThreadRead(head.thread_id);
      setDismissed((s) => {
        const next = new Set(s);
        next.add(head.thread_id);
        return next;
      });
      router.refresh();
    });
  }

  function ownerApproveUpdate() {
    if (!head) return;
    startTransition(async () => {
      const r = await approveSuggestedUpdate(head.thread_id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Aprovado. Autor notificado." : "Approved. Author notified.");
      await markThreadRead(head.thread_id);
      setDismissed((s) => {
        const next = new Set(s);
        next.add(head.thread_id);
        return next;
      });
      router.refresh();
    });
  }

  function submitReject() {
    if (!head) return;
    if (!rejectBody.trim()) return;
    startTransition(async () => {
      // Sysadmin rejecting a teacher's update request → rejectSuggestedUpdate.
      // Anyone else (teacher disagreeing with a sysadmin review) → rejectReviewThread.
      const r =
        isOwner && isUpdateRequest
          ? await rejectSuggestedUpdate({
              thread_id: head.thread_id,
              body: rejectBody,
            })
          : await rejectReviewThread({
              thread_id: head.thread_id,
              body: rejectBody,
            });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Resposta enviada." : "Reply sent.");
      await markThreadRead(head.thread_id);
      setDismissed((s) => {
        const next = new Set(s);
        next.add(head.thread_id);
        return next;
      });
      router.refresh();
    });
  }

  const isUpdateRequest =
    head.sender_role === "teacher" &&
    (head.subject ?? "").toLowerCase().startsWith("update request");
  const isReview =
    head.sender_role === "owner" && !head.is_reply && !isUpdateRequest;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(92vw,380px)]">
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <MessageSquare className="h-3.5 w-3.5" />
            {pt ? "Mensagem do sysadmin" : "Sysadmin message"}
          </div>
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {pt ? "De " : "From "}
          <span className="font-medium text-foreground">
            {head.sender_name || head.sender_email || "—"}
          </span>
          {head.bank_entry_title ? (
            <>
              {" · "}
              <span className="italic">{head.bank_entry_title}</span>
            </>
          ) : null}
        </p>
        {head.subject ? (
          <p className="mt-1 text-sm font-semibold">{head.subject}</p>
        ) : null}
        <p className="mt-1 line-clamp-5 whitespace-pre-wrap text-xs">
          {head.body}
        </p>

        {rejectingThis ? (
          <div className="mt-3 space-y-2">
            <textarea
              rows={3}
              value={rejectBody}
              onChange={(e) => setRejectBody(e.target.value)}
              className="w-full rounded-md border border-border bg-background p-2 text-xs"
              placeholder={
                pt
                  ? "Explique por que você discorda…"
                  : "Explain why you disagree…"
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRejectingFor(null);
                  setRejectBody("");
                }}
                disabled={pending}
              >
                {pt ? "Cancelar" : "Cancel"}
              </Button>
              <Button size="sm" onClick={submitReject} disabled={pending}>
                {pt ? "Enviar" : "Send"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            {isReview ? (
              <>
                <Button
                  size="sm"
                  onClick={approve}
                  disabled={pending}
                  className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  title={pt ? "Feito — modificações aplicadas" : "Done — modifications applied"}
                >
                  <Check className="h-4 w-4" />
                  {pt ? "Feito" : "Done"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectingFor(head.thread_id)}
                  disabled={pending}
                  className="h-8 gap-1.5 border-red-500 text-red-600 hover:bg-red-50"
                  title={pt ? "Discordo" : "Disagree"}
                >
                  <X className="h-4 w-4" />
                  {pt ? "Discordo" : "Disagree"}
                </Button>
              </>
            ) : null}
            {isOwner && isUpdateRequest ? (
              <>
                <Button
                  size="sm"
                  onClick={ownerApproveUpdate}
                  disabled={pending}
                  className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  {pt ? "Aprovar" : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectingFor(head.thread_id)}
                  disabled={pending}
                  className="h-8 gap-1.5 border-red-500 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                  {pt ? "Rejeitar" : "Reject"}
                </Button>
              </>
            ) : null}
            <Link
              href={messagesHref}
              className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {pt ? "Ver todas" : "See all"}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
        {visible.length > 1 ? (
          <p className="mt-2 text-[10px] text-muted-foreground">
            +{visible.length - 1} {pt ? "outra(s) mensagem(ns) não lida(s)" : "other unread"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
