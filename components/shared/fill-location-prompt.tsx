"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** True when the signed-in user's profile.location is blank. */
  show: boolean;
  role: "teacher" | "student";
}

/**
 * Closable Dialog nudging the user to fill their location. Opens on
 * every dashboard page render until location is set; skips the
 * /profile page so it never covers the form.
 *
 * The Dialog initial state is `open=false` on both SSR and the first
 * client paint, so no hydration mismatch. An effect then flips it to
 * open right after mount.
 */
export function FillLocationPrompt({ show, role }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const profileHref =
    role === "teacher" ? "/teacher/profile" : "/student/profile";
  const onProfilePage = pathname === profileHref;

  useEffect(() => {
    if (show && !onProfilePage) setOpen(true);
  }, [show, onProfilePage]);

  if (!show || onProfilePage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
            <MapPin className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">
            Complete seu perfil
          </DialogTitle>
          <DialogDescription className="text-center">
            Adicione sua cidade ao perfil — leva 10 segundos.
            {role === "teacher"
              ? " Ajuda seus alunos a saberem de onde você ensina."
              : " Assim seu professor sabe de onde você estuda."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Depois
          </Button>
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
          >
            Ir para o perfil
            <ArrowRight className="h-4 w-4" />
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
