"use client";

import { useI18n } from "@/lib/i18n/context";

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "pt-BR" : "en")}
      aria-label={locale === "en" ? "Mudar para Português" : "Switch to English"}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {locale === "en" ? (
        <>
          <span className="text-base leading-none">🇧🇷</span>
          <span className="hidden sm:inline">PT</span>
        </>
      ) : (
        <>
          <span className="text-base leading-none">🇺🇸</span>
          <span className="hidden sm:inline">EN</span>
        </>
      )}
    </button>
  );
}
