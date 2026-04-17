"use client";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

function UsFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 15"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="20" height="15" fill="#B22234" />
      <rect y="1.154" width="20" height="1.154" fill="#fff" />
      <rect y="3.461" width="20" height="1.154" fill="#fff" />
      <rect y="5.769" width="20" height="1.154" fill="#fff" />
      <rect y="8.076" width="20" height="1.154" fill="#fff" />
      <rect y="10.384" width="20" height="1.154" fill="#fff" />
      <rect y="12.691" width="20" height="1.154" fill="#fff" />
      <rect width="8" height="8.076" fill="#3C3B6E" />
    </svg>
  );
}

function BrFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 14"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="20" height="14" fill="#009B3A" />
      <polygon points="10,1.2 18.5,7 10,12.8 1.5,7" fill="#FFDF00" />
      <circle cx="10" cy="7" r="2.8" fill="#002776" />
    </svg>
  );
}

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  const isEN = locale === "en";
  const isPT = locale === "pt-BR";

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border bg-background/50 shadow-xs">
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={isEN}
        aria-label="Switch to English"
        title="English"
        className={cn(
          "inline-flex h-8 w-9 items-center justify-center transition-colors",
          isEN
            ? "bg-primary"
            : "hover:bg-accent"
        )}
      >
        <UsFlag
          className={cn(
            "h-4 w-[22px] rounded-[1px] ring-1 ring-black/10 transition-opacity",
            isEN ? "opacity-100" : "opacity-70"
          )}
        />
      </button>
      <div className="w-px bg-border" />
      <button
        type="button"
        onClick={() => setLocale("pt-BR")}
        aria-pressed={isPT}
        aria-label="Mudar para Português"
        title="Português"
        className={cn(
          "inline-flex h-8 w-9 items-center justify-center transition-colors",
          isPT
            ? "bg-primary"
            : "hover:bg-accent"
        )}
      >
        <BrFlag
          className={cn(
            "h-4 w-[22px] rounded-[1px] ring-1 ring-black/10 transition-opacity",
            isPT ? "opacity-100" : "opacity-70"
          )}
        />
      </button>
    </div>
  );
}
