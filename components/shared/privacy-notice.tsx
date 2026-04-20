"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import {
  PRIVACY_SECTIONS,
  PRIVACY_TAGLINE,
} from "@/lib/privacy/notice-content";

/**
 * A tiny "How your data is handled" badge that sits unobtrusively on the
 * profile page. Hover reveals a summary; click opens the full sectioned
 * disclosure. The content lives in `lib/privacy/notice-content.ts` — edit
 * there when the data model changes.
 */
export function PrivacyNotice() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const [open, setOpen] = useState(false);

  const label = isPt ? "Como seus dados são tratados" : "How your data is handled";
  const tagline = isPt ? PRIVACY_TAGLINE.pt : PRIVACY_TAGLINE.en;

  return (
    <>
      <div className="group relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {label}
        </button>
        {/* Hover tooltip (desktop) — summary only; click for the full panel */}
        <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-72 rounded-lg border border-border bg-card p-3 text-xs text-foreground shadow-xl group-hover:block">
          <p className="font-semibold">{tagline}</p>
          <p className="mt-1 text-muted-foreground">
            {isPt
              ? "Clique para ver detalhadamente o que mantemos e o que nunca fazemos."
              : "Click to read exactly what we keep, and what we never do."}
          </p>
        </div>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {PRIVACY_SECTIONS.map((section) => (
                <section key={section.title.en} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {isPt ? section.title.pt : section.title.en}
                  </h3>
                  <ul className="space-y-2">
                    {section.bullets.map((b) => (
                      <li
                        key={b.topic.en}
                        className="rounded-lg border border-border bg-card/50 p-3"
                      >
                        <p className="text-sm font-medium">
                          {isPt ? b.topic.pt : b.topic.en}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {isPt ? b.body.pt : b.body.en}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

          </div>
        </div>
      ) : null}
    </>
  );
}
