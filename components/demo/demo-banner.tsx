"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  backHref?: string;
  backLabel?: string;
}

export function DemoBanner({
  backHref = "/demo/teacher",
  backLabel = "Back to demo dashboard",
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:px-6">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="flex-1 text-xs font-medium text-amber-900 dark:text-amber-100">
          <strong>Demo mode</strong> — real UI, fake students. Buttons show a
          preview toast instead of saving.
        </p>
        <Link href="/login">
          <Button size="sm" className="h-7 text-xs">
            Sign up
          </Button>
        </Link>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs text-amber-900/80 hover:text-amber-900 dark:text-amber-100/80 dark:hover:text-amber-100"
        >
          <ArrowLeft className="h-3 w-3" />
          {backLabel}
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-900/60 hover:text-amber-900 dark:text-amber-100/60 dark:hover:text-amber-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
