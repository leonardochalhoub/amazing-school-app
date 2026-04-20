"use client";

import { useState } from "react";
import Link from "next/link";
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
  /** When true, the dialog opens on mount. Stays closed once dismissed
   *  for the current page render — navigation to a new route remounts
   *  the layout and re-opens it, so the nudge keeps firing until the
   *  user actually saves a location on their profile. */
  show: boolean;
  role: "teacher" | "student";
}

/**
 * Full-width, comfortable modal nagging the user to fill their
 * location on the profile page. Rendered from the dashboard layout
 * so it fires on every route until profile.location is populated.
 * Not dismissible beyond the "Mais tarde" button — once navigation
 * happens, the layout remounts and the dialog re-opens.
 */
export function FillLocationPrompt({ show, role }: Props) {
  const [open, setOpen] = useState(show);
  const profileHref =
    role === "teacher" ? "/teacher/profile" : "/student/profile";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-pink-500/20 text-indigo-600 dark:text-indigo-300">
            <MapPin className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">
            De onde você fala com a gente?
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            Adicione sua <strong>cidade</strong> ao perfil para que
            {" "}
            {role === "teacher" ? "seus alunos" : "seu professor"} e a
            comunidade saibam de onde você está estudando. Leva 10
            segundos — é só escolher da lista.
            <br />
            <span className="mt-2 block text-xs text-muted-foreground">
              Add your location so the community knows where you're
              studying from. Takes 10 seconds — pick it from the list.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm">
          <p className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
              1
            </span>
            <span>
              Clique em <strong>Ir para o perfil</strong> abaixo.
            </span>
          </p>
          <p className="mt-2 flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
              2
            </span>
            <span>
              Encontre o cartão <strong>Location · Localização</strong>
              {" "}
              e comece a digitar o nome da sua cidade.
            </span>
          </p>
          <p className="mt-2 flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
              3
            </span>
            <span>
              Selecione uma das opções ou digite livremente se estiver
              fora do Brasil.
            </span>
          </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Mais tarde · Later
          </Button>
          <Link
            href={profileHref}
            className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
          >
            Ir para o perfil · Go to Profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
