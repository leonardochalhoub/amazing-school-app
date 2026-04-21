"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Volume2,
  Languages,
  Loader2,
  Square,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { translateEnToPt } from "@/lib/ai/translate-en-to-pt";

/**
 * Speaking Lab "Say it out loud + Translate" widget. Two buttons:
 *   1. Speak — uses the browser's built-in SpeechSynthesis (free,
 *      no API call) to read the textarea aloud in en-US. Falls back
 *      to a polite warning if the platform doesn't support it.
 *   2. Translate — calls the AI translate-en-to-pt server action
 *      (Groq tier first when configured) and shows the pt-BR text
 *      below the textarea.
 */
export function SayTranslateBox() {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [speaking, setSpeaking] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // SpeechSynthesis voices load asynchronously on most browsers; we
  // only enable the Speak button once the voice list is populated
  // so the first click doesn't fire a no-op before the engine is
  // ready.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const update = () => {
      setVoiceReady(window.speechSynthesis.getVoices().length > 0);
    };
    update();
    window.speechSynthesis.addEventListener?.("voiceschanged", update);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", update);
      window.speechSynthesis.cancel();
    };
  }, []);

  function pickVoice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    // Prefer en-US voices, then any English voice, then default.
    return (
      voices.find((v) => v.lang === "en-US" && /Google|Microsoft/i.test(v.name)) ??
      voices.find((v) => v.lang === "en-US") ??
      voices.find((v) => v.lang.startsWith("en")) ??
      voices[0] ??
      null
    );
  }

  function speak() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error(pt ? "Digite algo primeiro." : "Type something first.");
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error(
        pt
          ? "Seu navegador não suporta leitura em voz alta."
          : "Your browser doesn't support speech.",
      );
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(trimmed);
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "en-US";
    }
    u.rate = 0.95;
    u.pitch = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utteranceRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  function stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  function translate() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error(pt ? "Digite algo primeiro." : "Type something first.");
      return;
    }
    startTransition(async () => {
      const res = await translateEnToPt(trimmed);
      if ("error" in res) {
        toast.error(
          pt
            ? `Não foi possível traduzir: ${res.error}`
            : `Couldn't translate: ${res.error}`,
        );
        return;
      }
      setTranslation(res.translation);
      setProvider(res.provider);
    });
  }

  const t = pt
    ? {
        title: "Diga em voz alta · Traduza",
        desc:
          "Cole ou digite uma frase em inglês. Clique no microfone para ouvir a IA falar, ou em traduzir para a versão em português.",
        placeholder: "Type any English sentence here…",
        speak: "Falar",
        stop: "Parar",
        translate: "Traduzir para PT-BR",
        translating: "Traduzindo…",
        translatedLabel: "Tradução",
        via: (p: string) => `Tradução via ${p}`,
      }
    : {
        title: "Say it out loud · Translate",
        desc:
          "Paste or type an English sentence. Tap the mic to hear the AI read it, or translate to see the Portuguese.",
        placeholder: "Type any English sentence here…",
        speak: "Speak",
        stop: "Stop",
        translate: "Translate to pt-BR",
        translating: "Translating…",
        translatedLabel: "Translation",
        via: (p: string) => `Translated via ${p}`,
      };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t.desc}</p>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // A new edit invalidates the previous translation.
            if (translation) setTranslation(null);
          }}
          placeholder={t.placeholder}
          rows={4}
          maxLength={2000}
        />
        <div className="flex flex-wrap gap-2">
          {speaking ? (
            <Button
              type="button"
              variant="outline"
              onClick={stop}
              className="gap-1.5"
            >
              <Square className="h-4 w-4" />
              {t.stop}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={speak}
              disabled={!voiceReady && typeof window !== "undefined"}
              className="gap-1.5"
            >
              <Volume2 className="h-4 w-4" />
              {t.speak}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={translate}
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            {pending ? t.translating : t.translate}
          </Button>
        </div>
        {translation ? (
          <div className="space-y-1 rounded-xl border border-border/70 bg-muted/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.translatedLabel}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {translation}
            </p>
            {provider ? (
              <p className="text-[10px] text-muted-foreground">
                {t.via(provider)}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
