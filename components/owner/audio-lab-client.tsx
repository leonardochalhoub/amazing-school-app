"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface TestResult {
  id: string;
  target: string;
  transcription: string;
  score: number;
  feedback: string;
  durationMs: number;
  audioUrl: string;
  at: string;
}

export function AudioLabClient() {
  const [target, setTarget] = useState("Good morning. How are you today?");
  const [state, setState] = useState<"idle" | "recording" | "processing">(
    "idle"
  );
  const [history, setHistory] = useState<TestResult[]>([]);
  const [error, setError] = useState("");
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef<number>(0);

  async function startRecording() {
    setError("");
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
    fd.append("target", target);
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
      const entry: TestResult = {
        id: crypto.randomUUID(),
        target: json.target,
        transcription: json.transcription,
        score: json.score,
        feedback: json.feedback,
        durationMs: dur,
        audioUrl: URL.createObjectURL(blob),
        at: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 10));
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("idle");
    }
  }

  function clearHistory() {
    for (const h of history) URL.revokeObjectURL(h.audioUrl);
    setHistory([]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target phrase
            </label>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Enter any English phrase…"
              className="h-10 text-base"
              disabled={state !== "idle"}
            />
            <p className="text-[11px] text-muted-foreground">
              Type any phrase. Record, stop, and see how Whisper scores you.
            </p>
          </div>

          {state === "idle" ? (
            <Button
              onClick={startRecording}
              disabled={!target.trim()}
              className="w-full gap-2"
              size="lg"
            >
              <Mic className="h-5 w-5" />
              Start recording
            </Button>
          ) : state === "recording" ? (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="w-full gap-2"
              size="lg"
            >
              <Square className="h-5 w-5 animate-pulse" />
              Stop and score
            </Button>
          ) : (
            <Button disabled className="w-full gap-2" size="lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              Transcribing…
            </Button>
          )}

          {error ? (
            <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {history.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent attempts
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
          <div className="space-y-3">
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      className={`text-2xl font-bold tabular-nums ${
                        h.score >= 70
                          ? "text-emerald-600"
                          : h.score >= 40
                            ? "text-amber-600"
                            : "text-destructive"
                      }`}
                    >
                      {h.score}/100
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {(h.durationMs / 1000).toFixed(1)}s ·{" "}
                      {new Date(h.at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Target: </span>
                      <strong>{h.target}</strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Heard: </span>
                      <strong>{h.transcription || "—"}</strong>
                    </p>
                    <p className="text-xs italic text-muted-foreground">
                      {h.feedback}
                    </p>
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    controls
                    src={h.audioUrl}
                    className="w-full"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pickMime(): string {
  const mimes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const m of mimes) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(m)
    )
      return m;
  }
  return "";
}
