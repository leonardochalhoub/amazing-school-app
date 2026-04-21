"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** True when the user hasn't set profile.location yet. */
  show: boolean;
  role: "teacher" | "student";
}

/**
 * Sticky non-modal banner nagging the user to fill their profile
 * location. Designed to be hard to miss without blocking the rest of
 * the UI — a Dialog here was absorbing other popups (upcoming class)
 * and the user had to close it manually even after navigating.
 *
 * Hidden automatically on the profile page itself so the banner doesn't
 * sit on top of the very form it's asking the user to fill.
 */
export function FillLocationPrompt({ show, role }: Props) {
  const pathname = usePathname();
  const profileHref =
    role === "teacher" ? "/teacher/profile" : "/student/profile";

  if (!show) return null;
  if (pathname === profileHref) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-8">
      <div className="relative flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border border-indigo-400/40 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-pink-500/10 p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
          <MapPin className="h-5 w-5" />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Complete seu perfil — adicione sua localização
          </p>
          <p className="text-xs text-muted-foreground">
            Leva 10 segundos para escolher a cidade na lista. Deixa seu
            perfil mais humano para {role === "teacher" ? "seus alunos" : "seu professor"}.
          </p>
        </div>
        <Link
          href={profileHref}
          className={cn(
            buttonVariants({ variant: "default" }),
            "relative gap-1.5",
          )}
        >
          Ir para o perfil
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
