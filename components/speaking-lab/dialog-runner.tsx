"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Loader2,
  RefreshCcw,
  Volume2,
  SkipForward,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DialogTurnAI {
  speaker: "ai";
  text: string;
  pt?: string;
}
export interface DialogTurnUser {
  speaker: "user";
  target: string;
  pt_hint?: string;
}
export type DialogTurn = DialogTurnAI | DialogTurnUser;

export interface SpeakingDialog {
  id: string;
  band: string;
  title: string;
  pt_summary?: string;
  character?: string;
  turns: DialogTurn[];
}

interface TurnResult {
  target: string;
  transcription: string;
  score: number;
  feedback: string;
}

type Phase =
  | "idle"
  | "ai-speaking"
  | "awaiting-user"
  | "recording"
  | "processing"
  | "done";

function pickMime(): string {
  for (const type of [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}

function speak(text: string, onDone: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone();
    return () => {};
  }
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  const voices = s.getVoices();
  const en = voices.find((v) => v.lang.startsWith("en-"));
  if (en) u.voice = en;
  u.onend = onDone;
  u.onerror = onDone;
  s.speak(u);
  return () => {
    u.onend = null;
    u.onerror = null;
    s.cancel();
  };
}

interface Props {
  all: SpeakingDialog[];
  initialId?: string;
}

export function SpeakingLabDialogRunner({ all, initialId }: Props) {
  const [selectedId, setSelectedId] = useState<string>(
    initialId ?? all[0]?.id ?? "",
  );
  const current = all.find((d) => d.id === selectedId) ?? all[0];

  const [phase, setPhase] = useState<Phase>("idle");
  const [turnIdx, setTurnIdx] = useState(0);
  const [results, setResults] = useState<Record<number, TurnResult>>({});
  const [error, setError] = useState("");

  const mr = useRef<MediaRecorder | null>(null);
  const startedAt = useRef<number>(0);
  const chunks = useRef<Blob[]>([]);
  const cancelSpeak = useRef<(() => void) | null>(null);

  // Single source of truth for advancing through the dialog. Recurses via
  // the TTS onDone callback so there is NO state race between phase and idx.
  function runFrom(idx: number) {
    if (!current) return;
    if (idx >= current.turns.length) {
      setTurnIdx(idx);
      setPhase("done");
      return;
    }
    setTurnIdx(idx);
    const turn = current.turns[idx];
    if (turn.speaker === "ai") {
      setPhase("ai-speaking");
      cancelSpeak.current?.();
      cancelSpeak.current = speak(turn.text, () => {
        // Small gap to feel natural, then continue.
        setTimeout(() => runFrom(idx + 1), 250);
      });
    } else {
      setPhase("awaiting-user");
    }
  }

  // When the user changes scenario, rewind.
  useEffect(() => {
    cancelSpeak.current?.();
    cancelSpeak.current = null;
    setPhase("idle");
    setTurnIdx(0);
    setResults({});
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      cancelSpeak.current?.();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function startDialog() {
    cancelSpeak.current?.();
    setResults({});
    setError("");
    runFrom(0);
  }

  function replayCurrentAI() {
    if (!current) return;
    const turn = current.turns[turnIdx];
    if (!turn || turn.speaker !== "ai") return;
    cancelSpeak.current?.();
    cancelSpeak.current = speak(turn.text, () => {});
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      mr.current = rec;
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // Log the mic cycle regardless of whether the upload
        // succeeds. Stop happens exactly once per recording, so
        // this is the right boundary to capture minutes.
        void fetch("/api/speaking-event", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            durationMs: Date.now() - startedAt.current,
            context: `dialog:${current?.id ?? "unknown"}`,
            startedAtIso: new Date(startedAt.current).toISOString(),
          }),
        }).catch(() => {});
        void upload();
      };
      startedAt.current = Date.now();
      rec.start();
      setPhase("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mic error");
      setPhase("awaiting-user");
    }
  }

  function stopRecording() {
    mr.current?.stop();
    setPhase("processing");
  }

  async function upload() {
    if (!current) return;
    const userTurn = current.turns[turnIdx] as DialogTurnUser;
    const blob = new Blob(chunks.current, {
      type: mr.current?.mimeType ?? "audio/webm",
    });
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    fd.append("target", userTurn.target);
    try {
      const res = await fetch("/api/pronunciation", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? `Error ${res.status}`);
        setPhase("awaiting-user");
        return;
      }
      const json = (await res.json()) as TurnResult;
      setResults((prev) => ({ ...prev, [turnIdx]: json }));
      runFrom(turnIdx + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("awaiting-user");
    }
  }

  function skipTurn() {
    runFrom(turnIdx + 1);
  }

  if (!current) {
    return <p className="text-sm text-muted-foreground">No dialogs available.</p>;
  }

  const scores = Object.values(results);
  const avg =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length);

  const currentTurn = current.turns[turnIdx];
  const lastResult = results[turnIdx - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Scenario
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          disabled={phase !== "idle" && phase !== "done"}
        >
          {all.map((d) => (
            <option key={d.id} value={d.id}>
              {d.band.toUpperCase()} · {d.title}
            </option>
          ))}
        </select>
        <Badge variant="secondary" className="text-[11px]">
          {current.turns.length} turns
        </Badge>
        {current.character ? (
          <Badge variant="outline" className="text-[11px]">
            with {current.character}
          </Badge>
        ) : null}
      </div>

      {current.pt_summary ? (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs italic text-muted-foreground">
          {current.pt_summary}
        </p>
      ) : null}

      {phase === "idle" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Press start. The AI will speak the first line, then you respond
              by recording your voice. After each user turn you get a score.
            </p>
            <Button size="lg" className="gap-2" onClick={startDialog}>
              <Volume2 className="h-5 w-5" />
              Start dialog
            </Button>
          </CardContent>
        </Card>
      ) : phase === "done" ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-lg font-bold">Dialog complete</p>
                <p className="text-xs text-muted-foreground">
                  Average score over {scores.length} spoken response
                  {scores.length === 1 ? "" : "s"}
                </p>
              </div>
              <div
                className={`ml-auto text-4xl font-bold tabular-nums ${
                  avg >= 70
                    ? "text-emerald-600"
                    : avg >= 40
                      ? "text-amber-600"
                      : "text-destructive"
                }`}
              >
                {avg}/100
              </div>
            </div>
            <div className="space-y-2">
              {current.turns.map((t, i) => {
                if (t.speaker === "ai") {
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-background/60 p-3"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {current.character ?? "AI"}
                      </p>
                      <p className="text-sm">{t.text}</p>
                    </div>
                  );
                }
                const r = results[i];
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-primary/30 bg-primary/5 p-3"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-primary">
                      You
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Expected: </span>
                      {t.target}
                    </p>
                    {r ? (
                      <>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Heard: </span>
                          {r.transcription || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Score: <strong>{r.score}/100</strong> · {r.feedback}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        (skipped)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={startDialog} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Turn {turnIdx + 1} of {current.turns.length}
              </p>
              <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-primary transition-all"
                  style={{
                    width: `${((turnIdx + 1) / current.turns.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {currentTurn?.speaker === "ai" ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {current.character ?? "AI"} says
                </p>
                <p className="text-lg font-medium">{currentTurn.text}</p>
                {currentTurn.pt ? (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {currentTurn.pt}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  {phase === "ai-speaking" ? (
                    <span className="flex items-center gap-2 text-xs text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Speaking…
                    </span>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={replayCurrentAI}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Replay
                  </Button>
                </div>
              </div>
            ) : currentTurn?.speaker === "user" ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-primary">
                  Your turn — say
                </p>
                <p className="text-lg font-semibold">{currentTurn.target}</p>
                {currentTurn.pt_hint ? (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {currentTurn.pt_hint}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {phase === "awaiting-user" ? (
                    <Button size="lg" className="gap-2" onClick={startRecording}>
                      <Mic className="h-5 w-5" />
                      Record your response
                    </Button>
                  ) : phase === "recording" ? (
                    <Button
                      size="lg"
                      variant="destructive"
                      className="gap-2"
                      onClick={stopRecording}
                    >
                      <Square className="h-5 w-5 animate-pulse" />
                      Stop and score
                    </Button>
                  ) : (
                    <Button disabled size="lg" className="gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Scoring…
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="gap-1.5"
                    onClick={skipTurn}
                    disabled={phase === "recording" || phase === "processing"}
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {lastResult ? (
              <div className="rounded-lg border border-border bg-background p-3 text-xs">
                <span className="text-muted-foreground">Last response: </span>
                <strong>{lastResult.score}/100</strong> · {lastResult.feedback}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
