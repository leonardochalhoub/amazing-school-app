"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ArrowRight, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** True when the signed-in user's profile.location is blank. */
  show: boolean;
  role: "teacher" | "student";
}

/**
 * Plain overlay + card. Bypasses base-ui Dialog entirely because
 * previous iterations weren't rendering. This is just a fixed
 * backdrop + centered card, closed by the X button, "Depois", or
 * Escape key. Stays hidden on the profile page so it can't cover
 * the form the user is filling.
 *
 * Gated behind a client mount flag so SSR emits nothing and
 * hydration can't diverge.
 */
export function FillLocationPrompt({ show, role }: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(false);

  const profileHref =
    role === "teacher" ? "/teacher/profile" : "/student/profile";
  const onProfilePage = pathname === profileHref;
  const visible = mounted && show && !closed && !onProfilePage;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setClosed(true);
    }
    document.addEventListener("keydown", onKey);
    // Freeze background scroll while the popup is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fill-location-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => setClosed(true)}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-border">
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => setClosed(true)}
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 text-white shadow-sm">
          <MapPin className="h-7 w-7" />
        </div>
        <h2
          id="fill-location-title"
          className="text-center text-lg font-semibold"
        >
          Complete seu perfil
        </h2>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Adicione sua cidade ao perfil — leva 10 segundos.
          {role === "teacher"
            ? " Ajuda seus alunos a saberem de onde você ensina."
            : " Assim seu professor sabe de onde você estuda."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setClosed(true)}
          >
            Depois
          </Button>
          <Link
            href={profileHref}
            onClick={() => setClosed(true)}
            className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
          >
            Ir para o perfil
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
