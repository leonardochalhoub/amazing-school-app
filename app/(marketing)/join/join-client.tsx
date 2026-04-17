"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/actions/auth";
import { claimInvitation } from "@/lib/actions/student-invitations";

interface Props {
  token: string;
  prefillEmail: string | null;
  prefillName: string | null;
  currentlySignedIn: boolean;
}

export function JoinClient({
  token,
  prefillEmail,
  prefillName,
  currentlySignedIn,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Signup form fields (only shown if not signed in).
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(prefillName ?? "");

  function acceptExisting() {
    startTransition(async () => {
      const r = await claimInvitation(token);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("You're in! Welcome.");
      router.push("/student");
    });
  }

  function signupAndClaim() {
    if (!email.trim() || !password || password.length < 6) {
      toast.error("Enter your email and a password of at least 6 characters.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("email", email.trim());
      fd.append("password", password);
      fd.append("fullName", fullName.trim() || email.split("@")[0]);
      fd.append("role", "student");
      fd.append("inviteToken", token);
      const res = await signUp(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      // signUp may or may not sign us in immediately depending on email
      // confirmation settings. Try to claim anyway — if we're signed in the
      // claim works; otherwise we redirect to login with a return-to.
      const claim = await claimInvitation(token);
      if ("error" in claim && claim.error) {
        // Likely not auto-signed-in. Send to login with token preserved.
        toast.info(
          "Account created. Sign in with your email and password to finish joining."
        );
        router.push(`/login?next=/join?token=${token}`);
        return;
      }
      toast.success("Account created — welcome!");
      router.push("/student");
    });
  }

  if (currentlySignedIn) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          You&apos;re already signed in. Accept the invitation to join the
          classroom.
        </p>
        <Button
          onClick={acceptExisting}
          disabled={pending}
          className="w-full"
        >
          {pending ? "Joining…" : "Accept invitation"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="join-name">Your name</Label>
          <Input
            id="join-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Maria Silva"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="join-email">Email</Label>
          <Input
            id="join-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="join-password">Choose a password</Label>
          <Input
            id="join-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
      </div>
      <Button
        onClick={signupAndClaim}
        disabled={pending}
        className="w-full"
      >
        {pending ? "Creating account…" : "Create account & join"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login?next=/join?token=${token}`}
          className="text-primary hover:underline"
        >
          Sign in and accept
        </Link>
      </p>
    </div>
  );
}
