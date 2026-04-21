"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrazilCityPicker } from "@/components/shared/brazil-city-picker";
import { signOutStay, signUp } from "@/lib/actions/auth";
import { claimInvitation } from "@/lib/actions/student-invitations";

interface Props {
  token: string;
  prefillEmail: string | null;
  prefillName: string | null;
  currentlySignedIn: boolean;
  currentUserEmail: string | null;
}

export function JoinClient({
  token,
  prefillEmail,
  prefillName,
  currentlySignedIn,
  currentUserEmail,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Signup form fields (only shown if not signed in).
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(prefillName ?? "");
  const [location, setLocation] = useState("");

  function handleSignOutAndStay() {
    startTransition(async () => {
      // signOutStay clears the Supabase session but does NOT redirect, so we
      // stay on /join?token=… and the server component can re-render the page
      // with the signup form.
      await signOutStay();
      router.refresh();
    });
  }

  function signupAndClaim() {
    if (!email.trim() || !password || password.length < 6) {
      toast.error("Enter your email and a password of at least 6 characters.");
      return;
    }
    if (!location.trim()) {
      toast.error("Escolha sua cidade (obrigatório).");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("email", email.trim());
      fd.append("password", password);
      fd.append("fullName", fullName.trim() || email.split("@")[0]);
      fd.append("location", location.trim());
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
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">
              Another account is signed in{currentUserEmail ? ` (${currentUserEmail})` : ""}.
            </p>
            <p className="text-xs text-muted-foreground">
              Invitations can&apos;t be accepted by a different user. Sign out
              first, then create your own account on this page.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSignOutAndStay}
          disabled={pending}
          variant="outline"
          className="w-full"
        >
          {pending ? "Signing out…" : "Sign out and continue"}
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
        <div className="space-y-1.5">
          <Label htmlFor="join-location">Cidade · City (obrigatório)</Label>
          <BrazilCityPicker
            value={location}
            onChange={setLocation}
            placeholder="São Paulo, SP"
          />
          <p className="text-[11px] text-muted-foreground">
            Comece a digitar — a lista filtra as cidades brasileiras.
            Se estiver fora do Brasil, digite livremente.
          </p>
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
