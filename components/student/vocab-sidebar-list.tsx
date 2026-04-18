"use client";

import { ExternalLink } from "lucide-react";
import { cambridgeUrl, type VocabHook } from "@/lib/content/music";
import { useVocabTranslations } from "@/lib/use-vocab-translations";

interface Props {
  vocabHooks: VocabHook[];
  locale?: "en-US" | "pt-BR";
}

/**
 * Renders the vocabulary sidebar on a music page. Any vocab_hooks[].pt
 * that's empty triggers an on-demand DeepL lookup via /api/translate,
 * cached per-term in localStorage.
 */
export function VocabSidebarList({ vocabHooks, locale = "en-US" }: Props) {
  const missingTerms = vocabHooks
    .filter((v) => !v.pt || v.pt.length === 0)
    .map((v) => v.term);
  const translations = useVocabTranslations(missingTerms);
  const usingMyMemory = missingTerms.length > 0;

  return (
    <>
      <ul className="space-y-2 text-sm">
        {vocabHooks.map((v) => {
          const pt = v.pt && v.pt.length > 0 ? v.pt : translations[v.term];
          return (
            <li key={v.term} className="flex flex-col">
              <span className="inline-flex items-center gap-1">
                <a
                  href={cambridgeUrl(v.term)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline decoration-dotted underline-offset-2 hover:text-primary"
                  title={`Cambridge Dictionary: ${v.term}`}
                >
                  {v.term}
                </a>
                <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                {pt ? (
                  <span className="text-muted-foreground">· {pt}</span>
                ) : null}
              </span>
              {v.note ? (
                <span className="text-[11px] text-muted-foreground">
                  {v.note}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10px] text-muted-foreground">
        {locale === "pt-BR"
          ? "Definições: Cambridge Dictionary"
          : "Definitions: Cambridge Dictionary"}
        {usingMyMemory ? (
          <>
            {" · "}
            {locale === "pt-BR" ? "Tradução: MyMemory" : "Translation: MyMemory"}
          </>
        ) : null}
      </p>
    </>
  );
}
