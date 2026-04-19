"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { setSchoolLogoEnabled } from "@/lib/actions/school-logo";

interface Props {
  initialEnabled: boolean;
  /** Path shown in the preview when enabled. */
  logoSrc: string;
}

/**
 * Rendered only for whitelisted teachers (see resolveSchoolLogo +
 * isLogoEligible). Flips profiles.school_logo_enabled on/off and shows
 * a small preview of the brand image that will appear in the navbar.
 */
export function SchoolLogoToggle({ initialEnabled, logoSrc }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await setSchoolLogoEnabled(next);
      if ("error" in res && res.error) {
        toast.error(res.error);
        setEnabled(!next); // revert on failure
        return;
      }
      toast.success(
        next ? "Brand logo enabled" : "Brand logo disabled",
      );
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        When on, the image below appears centered at the top of every page
        you're signed into. It replaces the default Amazing School
        wordmark until you turn it off again.
      </p>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-3">
        <div className="flex h-16 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="School brand preview"
            className={`max-h-14 w-auto object-contain transition-opacity ${enabled ? "opacity-100" : "opacity-30"}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {enabled ? "Showing on the navbar" : "Hidden"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {logoSrc.replace(/%20/g, " ")}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors ${
            enabled
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              : "border-border bg-background text-foreground hover:bg-muted"
          }`}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}
