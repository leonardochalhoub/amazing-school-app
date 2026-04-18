"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Volume2,
  Square,
  Loader2,
  CheckCircle2,
  PlayCircle,
  Save,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { saveListeningResponse } from "@/lib/actions/listening-responses";

export interface ListeningParagraph {
  speaker?: string;
  voice?: "narrator" | "male1" | "male2" | "female1" | "female2";
  en: string;
  pt?: string;
}

interface Props {
  lessonSlug: string;
  sceneId: string;
  title: string;
  promptEn: string;
  promptPt?: string;
  paragraphs: ListeningParagraph[];
}

/**
 * Pick an `en-*` voice matching the requested flavor. We prefer
 * distinct voices for each speaker so a dialog feels real, even
 * though the browser's available voices vary per platform.
 */
function pickVoice(
  voices: SpeechSynthesisVoice[],
  flavor: ListeningParagraph["voice"],
): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.startsWith("en-"));
  if (en.length === 0) return null;

  const looksFemale = (v: SpeechSynthesisVoice) =>
    /(female|woman|zira|samantha|karen|victoria|tessa|moira|fiona|susan|serena|allison|ava|nicky)/i.test(
      `${v.name}${v.voiceURI}`,
    );
  const looksMale = (v: SpeechSynthesisVoice) =>
    /(male|man|david|mark|daniel|oliver|fred|alex|aaron|tom|gordon|rishi|arthur)/i.test(
      `${v.name}${v.voiceURI}`,
    );

  const females = en.filter(looksFemale);
  const males = en.filter(looksMale);
  const others = en.filter((v) => !looksFemale(v) && !looksMale(v));

  switch (flavor) {
    case "female1":
      return females[0] ?? others[0] ?? en[0];
    case "female2":
      return females[1] ?? females[0] ?? others[1] ?? en[1] ?? en[0];
    case "male1":
      return males[0] ?? others[0] ?? en[0];
    case "male2":
      return males[1] ?? males[0] ?? others[1] ?? en[1] ?? en[0];
    case "narrator":
    default:
      return others[0] ?? en[0];
  }
}

function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
  onDone: () => void,
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone();
    return () => {};
  }
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? "en-US";
  u.rate = 0.95;
  if (voice) u.voice = voice;
  u.onend = onDone;
  u.onerror = onDone;
  s.speak(u);
  return () => {
    u.onend = null;
    u.onerror = null;
    s.cancel();
  };
}

export function ListeningStoryPlayer({
  lessonSlug,
  sceneId,
  title,
  promptEn,
  promptPt,
  paragraphs,
}: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<"idle" | "playing-all">("idle");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const cancelSpeak = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      cancelSpeak.current?.();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stop() {
    cancelSpeak.current?.();
    cancelSpeak.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingIdx(null);
    setMode("idle");
  }

  function playOne(idx: number) {
    stop();
    const p = paragraphs[idx];
    if (!p) return;
    setPlayingIdx(idx);
    setMode("idle");
    const v = pickVoice(voices, p.voice);
    cancelSpeak.current = speak(p.en, v, () => {
      setPlayingIdx((cur) => (cur === idx ? null : cur));
    });
  }

  function playAll() {
    stop();
    setMode("playing-all");
    const runFrom = (idx: number) => {
      if (idx >= paragraphs.length) {
        setPlayingIdx(null);
        setMode("idle");
        return;
      }
      const p = paragraphs[idx];
      setPlayingIdx(idx);
      const v = pickVoice(voices, p.voice);
      cancelSpeak.current = speak(p.en, v, () => {
        setTimeout(() => runFrom(idx + 1), 300);
      });
    };
    runFrom(0);
  }

  async function save() {
    setSaving(true);
    const res = await saveListeningResponse({
      lessonSlug,
      sceneId,
      responseText: response,
    });
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setSavedId(res.id);
    toast.success("Response saved — your teacher will review it.");
  }

  const words = response.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-3 py-2 text-violet-700 dark:text-violet-400">
        <Headphones className="h-5 w-5" />
        <h3 className="text-base font-semibold">🎧 {title}</h3>
      </div>

      <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {mode === "playing-all" ? (
              <Button onClick={stop} variant="destructive" className="gap-2">
                <Square className="h-4 w-4 animate-pulse" />
                Stop
              </Button>
            ) : (
              <Button onClick={playAll} className="gap-2">
                <PlayCircle className="h-4 w-4" />
                Listen to full story
              </Button>
            )}
            <Badge variant="secondary" className="text-[11px]">
              {paragraphs.length} paragraphs
            </Badge>
          </div>

          <div className="space-y-3">
            {paragraphs.map((p, i) => {
              const isActive = playingIdx === i;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 transition-colors ${
                    isActive
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.speaker ?? "Narrator"}
                    </p>
                    <button
                      type="button"
                      onClick={() => (isActive ? stop() : playOne(i))}
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        isActive
                          ? "bg-violet-500 text-white"
                          : "border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Square className="h-3 w-3 animate-pulse" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" />
                          Play
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed">{p.en}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your task
            </p>
            <p className="mt-1 font-medium">{promptEn}</p>
            {promptPt ? (
              <p className="mt-0.5 text-xs italic text-muted-foreground">
                {promptPt}
              </p>
            ) : null}
          </div>

          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write in English what you heard or understood…"
            className="min-h-32"
            disabled={saving || Boolean(savedId)}
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {words} word{words === 1 ? "" : "s"} · {response.length}/4000
            </span>
            {savedId ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Saved for teacher review
              </span>
            ) : (
              <Button
                onClick={save}
                disabled={saving || response.trim().length < 5}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save response
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
