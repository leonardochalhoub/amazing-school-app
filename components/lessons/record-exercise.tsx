"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  target: string;
  targetPt?: string;
  onScored: (result: { score: number; transcription: string }) => void;
}

/**
 * Pronunciation exercise: user records a short phrase, the recording is
 * sent to /api/pronunciation (Groq Whisper), and we show a similarity
 * score (0–100) plus the transcription.
 */
export function RecordExercise({ target, targetPt, onScored }: Props) {
  const [state, setState] = useState<
    "idle" | "recording" | "processing" | "scored" | "error"
  >("idle");
  const [result, setResult] = useState<{
    score: number;
    transcription: string;
    feedback: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: pickSupportedMime(),
      });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        uploadRecording();
      };
      mr.start();
      setState("recording");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Microphone access denied"
      );
      setState("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setState("processing");
  }

  async function uploadRecording() {
    const blob = new Blob(chunksRef.current, {
      type: mediaRecorderRef.current?.mimeType ?? "audio/webm",
    });
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    fd.append("target", target);
    try {
      const res = await fetch("/api/pronunciation", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(body.error ?? `Server error ${res.status}`);
        setState("error");
        return;
      }
      const json = (await res.json()) as {
        score: number;
        transcription: string;
        feedback: string;
      };
      setResult(json);
      setState("scored");
      onScored({ score: json.score, transcription: json.transcription });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  }

  function tryAgain() {
    setResult(null);
    setErrorMsg("");
    setState("idle");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Record this phrase
        </p>
        <p className="mt-1 text-lg font-semibold leading-relaxed">
          &ldquo;{target}&rdquo;
        </p>
        {targetPt ? (
          <p className="text-xs italic text-muted-foreground">{targetPt}</p>
        ) : null}
      </div>

      {state === "idle" ? (
        <Button onClick={startRecording} className="w-full gap-2" size="lg">
          <Mic className="h-5 w-5" />
          Start recording
        </Button>
      ) : null}

      {state === "recording" ? (
        <Button
          onClick={stopRecording}
          variant="destructive"
          className="w-full gap-2"
          size="lg"
        >
          <Square className="h-5 w-5 animate-pulse" />
          Stop and score
        </Button>
      ) : null}

      {state === "processing" ? (
        <Button disabled className="w-full gap-2" size="lg">
          <Loader2 className="h-5 w-5 animate-spin" />
          Transcribing…
        </Button>
      ) : null}

      {state === "scored" && result ? (
        <div
          className={`space-y-2 rounded-lg p-4 ${
            result.score >= 70
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : result.score >= 40
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {result.score >= 70 ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <p className="text-lg font-bold">Score: {result.score}/100</p>
          </div>
          <p className="text-sm">{result.feedback}</p>
          <p className="text-xs opacity-70">
            We heard: <strong>{result.transcription || "—"}</strong>
          </p>
          <Button
            onClick={tryAgain}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : null}

      {state === "error" ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-semibold">Could not record</p>
          <p className="text-xs">{errorMsg}</p>
          <Button
            onClick={tryAgain}
            variant="outline"
            size="sm"
            className="mt-2 gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function pickSupportedMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const m of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(m)
    )
      return m;
  }
  return "";
}
