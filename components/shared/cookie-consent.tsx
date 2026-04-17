"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

const STORAGE_KEY = "as-cookie-consent-v1";
type Decision = "accepted" | "essential-only";

interface Stored {
  decision: Decision;
  decidedAt: string;
}

export function CookieConsent() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const [decision, setDecision] = useState<Decision | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        setDecision(parsed.decision);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  function persist(d: Decision) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ decision: d, decidedAt: new Date().toISOString() })
      );
    } catch {
      // ignore
    }
    setDecision(d);
  }

  if (!ready || decision) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 md:p-4">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-md md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
          <div className="flex-1 text-sm">
            <p className="font-semibold">
              {isPt ? "🍪 Cookies e sua privacidade" : "🍪 Cookies and your privacy"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isPt ? (
                <>
                  Usamos cookies essenciais para manter você autenticado e salvar
                  suas preferências (idioma e tema). Não vendemos nem
                  compartilhamos seus dados. Em conformidade com a LGPD (Lei
                  13.709/18) e o GDPR — veja nossa{" "}
                  <Link href="/privacy" className="underline hover:text-foreground">
                    política de privacidade
                  </Link>
                  .
                </>
              ) : (
                <>
                  We use essential cookies to keep you signed in and save your
                  preferences (language, theme). We don&apos;t sell or share your
                  data. Compliant with Brazilian LGPD (Law 13.709/18) and the
                  GDPR — see our{" "}
                  <Link href="/privacy" className="underline hover:text-foreground">
                    privacy policy
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => persist("essential-only")}
              className="flex-1 md:flex-none"
            >
              {isPt ? "Só essenciais" : "Essential only"}
            </Button>
            <Button
              size="sm"
              onClick={() => persist("accepted")}
              className="flex-1 md:flex-none"
            >
              {isPt ? "Aceitar tudo" : "Accept all"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
