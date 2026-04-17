import fs from "node:fs";
import path from "node:path";
import { MANIFESTS_DIR } from "../config";

export interface Manifest {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  args: Record<string, string | number | boolean | undefined>;
  stages: Record<string, { ok: number; failed: number; skipped: number }>;
  cost: Record<string, { inputTokens: number; outputTokens: number; usd: number }>;
  rejected: Array<{ slug: string; reason: string }>;
  totalUsd: number;
}

export function createManifest(runId: string, args: Manifest["args"]): Manifest {
  return {
    runId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    args,
    stages: {},
    cost: {},
    rejected: [],
    totalUsd: 0,
  };
}

export function writeManifest(m: Manifest): string {
  fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
  const file = path.join(MANIFESTS_DIR, `${m.runId}.json`);
  fs.writeFileSync(file, JSON.stringify(m, null, 2));
  return file;
}

export function newRunId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}-` +
    Math.random().toString(36).slice(2, 8)
  );
}
