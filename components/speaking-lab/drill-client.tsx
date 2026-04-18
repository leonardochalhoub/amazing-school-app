"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SpeakingDrill {
  id: string;
  band: string;
  focus: string;
  target: string;
  pt_hint: string;
}

function pickRandom<T>(arr: T[], exceptId?: string): T {
  const pool = exceptId ? arr.filter((x) => (x as unknown as { id: string }).id !== exceptId) : arr;
  return pool[Math.floor(Math.random() * pool.length)] ?? arr[0];
}

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

interface Result {
  target: string;
  transcription: string;
  score: number;
  feedback: string;
  durationMs: number;
  audioUrl: string;
}

interface Props {
  all: SpeakingDrill[];
}

export function SpeakingLabDrill({ all }: Props) {
  const [current, setCurrent] = useState<SpeakingDrill>(() => pickRandom(all));
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef<number>(0);

  // Clean up the last audio object URL when we get a new one or unmount.
  useEffect(() => {
    return () => {
      if (result?.audioUrl) URL.revokeObjectURL(result.audioUrl);
    };
    // Intentionally watching only audioUrl — we need to revoke the
    // previous URL whenever a new result is produced.
  }, [result?.audioUrl]);

  const nextExercise = useCallback(() => {
    setResult(null);
    setError("");
    setCurrent((prev) => pickRandom(all, prev.id));
  }, [all]);

  async function startRecording() {
    setError("");
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      mr.current = rec;
      chunks.current = [];
      startedAt.current = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        upload();
      };
      rec.start();
      setState("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mic error");
      setState("idle");
    }
  }

  function stopRecording() {
    mr.current?.stop();
    setState("processing");
  }

  async function upload() {
    const dur = Date.now() - startedAt.current;
    const blob = new Blob(chunks.current, {
      type: mr.current?.mimeType ?? "audio/webm",
    });
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    fd.append("target", current.target);
    try {
      const res = await fetch("/api/pronunciation", { method: "POST", body: fd });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? `Error ${res.status}`);
        setState("idle");
        return;
      }
      const json = (await res.json()) as {
        target: string;
        transcription: string;
        score: number;
        feedback: string;
      };
      setResult({
        target: json.target,
        transcription: json.transcription,
        score: json.score,
        feedback: json.feedback,
        durationMs: dur,
        audioUrl: URL.createObjectURL(blob),
      });
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("idle");
    }
  }

  const scoreColor =
    result == null
      ? ""
      : result.score >= 70
        ? "text-emerald-600"
        : result.score >= 40
          ? "text-amber-600"
          : "text-destructive";

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="text-[11px]">
              {current.band.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              {current.focus}
            </Badge>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              #{current.id}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Say this out loud
            </p>
            <p className="text-2xl font-semibold leading-snug tracking-tight">
              {current.target}
            </p>
            {current.pt_hint ? (
              <p className="text-xs italic text-muted-foreground">
                {current.pt_hint}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {state === "idle" ? (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Start recording
              </Button>
            ) : state === "recording" ? (
              <Button
                onClick={stopRecording}
                size="lg"
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-5 w-5 animate-pulse" />
                Stop and score
              </Button>
            ) : (
              <Button disabled size="lg" className="gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Transcribing…
              </Button>
            )}

            <Button
              onClick={nextExercise}
              size="lg"
              variant="outline"
              className="gap-2"
              disabled={state !== "idle"}
            >
              <RefreshCcw className="h-4 w-4" />
              Next exercise
            </Button>
          </div>

          {error ? (
            <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={`text-4xl font-bold tabular-nums ${scoreColor}`}>
                {result.score}/100
              </div>
              <span className="text-[11px] text-muted-foreground">
                {(result.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Target: </span>
                <strong>{result.target}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Heard: </span>
                <strong>{result.transcription || "—"}</strong>
              </p>
              <p className="text-xs italic text-muted-foreground">
                {result.feedback}
              </p>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={result.audioUrl} className="w-full" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
