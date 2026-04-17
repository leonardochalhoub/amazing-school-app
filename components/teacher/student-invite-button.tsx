"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudentInvitation } from "@/lib/actions/student-invitations";

interface Props {
  rosterStudentId: string;
  classroomId: string | null;
  prefillEmail?: string | null;
  prefillName?: string | null;
}

export function StudentInviteButton({
  rosterStudentId,
  classroomId,
  prefillEmail,
  prefillName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [link, setLink] = useState<string | null>(null);

  function reset() {
    setLink(null);
    setEmail(prefillEmail ?? "");
  }

  function generate() {
    if (!classroomId) {
      toast.error("Add this student to a classroom first.");
      return;
    }
    startTransition(async () => {
      const r = await createStudentInvitation({
        classroomId,
        rosterStudentId,
        email: email.trim() || undefined,
        displayName: prefillName ?? undefined,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r && r.invitation) {
        const url = `${window.location.origin}/join?token=${r.invitation.token}`;
        setLink(url);
      }
    });
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied — share it with your student.");
    } catch {
      toast.error("Could not access the clipboard. Select and copy manually.");
    }
  }

  function mailtoHref(): string {
    if (!link) return "#";
    const to = email.trim();
    const subject = encodeURIComponent(
      `You're invited to join ${prefillName ? "Amazing School" : "my class"}`
    );
    const body = encodeURIComponent(
      `Hi${prefillName ? ` ${prefillName}` : ""},\n\n` +
        `I've invited you to our English classroom on Amazing School. ` +
        `Click this link to create your account and start practicing:\n\n` +
        `${link}\n\n` +
        `The link works for 14 days and can only be used once.`
    );
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!classroomId}
        className="gap-1.5"
        title={
          !classroomId ? "Assign this student to a classroom first" : undefined
        }
      >
        <Share2 className="h-4 w-4" />
        Invite to join
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite student</DialogTitle>
            <DialogDescription>
              Generate a private link. Share it by email, WhatsApp, or hand it
              to your student. The link works for 14 days and is single-use.
            </DialogDescription>
          </DialogHeader>

          {link === null ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-email">Email (optional)</Label>
                <Input
                  id="inv-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                />
                <p className="text-[11px] text-muted-foreground">
                  If you add the email, we pre-fill it when they sign up and
                  offer a "Compose email" button to send the link.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Invite link</Label>
                <div className="flex items-center gap-2">
                  <Input value={link} readOnly className="font-mono text-xs" />
                  <Button
                    type="button"
                    size="sm"
                    onClick={copyLink}
                    className="gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>

              {email ? (
                <a href={mailtoHref()} className="block">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Compose email to {email}
                  </Button>
                </a>
              ) : null}

              <p className="text-[11px] text-muted-foreground">
                The link creates an account linked to this roster entry. Their
                name, age, and avatar carry over automatically.
              </p>
            </div>
          )}

          <DialogFooter>
            {link === null ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button onClick={generate} disabled={pending}>
                  {pending ? "Generating…" : "Generate link"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
