"use client";

import { useState } from "react";
import { Volume2, Square } from "lucide-react";

interface Props {
  text: string;
  /** 0.8 = slow, 1.0 = normal, 1.2 = fast. Default 0.95 for learners. */
  rate?: number;
  lang?: string;
  className?: string;
}

/**
 * Uses the browser's Web Speech API (speechSynthesis) — FREE, no key, no
 * network call. Most browsers ship at least one English voice; Chrome
 * and Edge ship several (US, UK, AU, neural). Perfect for 'listen and
 * repeat' on every narrative line.
 */
export function SpeakButton({
  text,
  rate = 0.95,
  lang = "en-US",
  className,
}: Props) {
  const [speaking, setSpeaking] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith("en"));
    if (englishVoice) utter.voice = englishVoice;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      aria-label={speaking ? "Stop" : "Listen"}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-primary transition-colors hover:bg-primary/15 ${className ?? ""}`}
      title={speaking ? "Stop" : "Listen"}
    >
      {speaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}
