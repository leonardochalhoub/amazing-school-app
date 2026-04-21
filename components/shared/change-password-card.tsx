"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/actions/change-password";

interface Props {
  /** Pass true for demo accounts so we can show a friendly disabled state. */
  isDemo?: boolean;
}

/**
 * Password-change card. Collapsed by default so the profile page
 * doesn't grow a big form nobody uses — tap the button to expand.
 * Requires the current password as a security check; the new
 * password must be at least 8 chars and is re-typed to catch typos.
 */
export function ChangePasswordCard({ isDemo = false }: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNext, setShowNext] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setShowNext(false);
    setOpen(false);
  }

  function submit() {
    if (!current) {
      toast.error("Enter your current password");
      return;
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("The two new passwords don't match");
      return;
    }
    startTransition(async () => {
      const res = await changePassword({ current, next });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated — use the new one next time you sign in.");
      reset();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" />
          Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <p className="text-xs text-muted-foreground">
          Choose a strong password — at least 8 characters. You'll stay
          signed in here; use the new password next time.
        </p>
        {isDemo ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            Demo accounts share a password across every visitor —
            changing it would lock everyone else out. Create your own
            account to manage credentials.
          </p>
        ) : !open ? (
          <>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Change password
              </Button>
            </div>
            <ul className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                Mix upper and lower case, numbers, and at least one symbol.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                Don't reuse passwords from other sites — each account
                deserves its own.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                A password manager (1Password, Bitwarden, Apple Keychain)
                makes this painless.
              </li>
            </ul>
          </>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNext ? "text" : "password"}
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  disabled={pending}
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showNext ? "Hide password" : "Show password"}
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showNext ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                At least 8 characters. Mixing cases, numbers, and symbols
                makes it harder to guess.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reset}
                disabled={pending}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={pending}
                className="gap-1.5"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save new password
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
