#!/usr/bin/env node
// Push 4 required env vars from .env.local into a Vercel project for the
// "production" target. Values never appear in process arguments — we read
// them from the local file and POST them to the Vercel REST API with the
// token in an Authorization header.
//
// Usage:
//   VERCEL_TOKEN=xxx node scripts/vercel-env-push.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) {
  console.error("Set VERCEL_TOKEN environment variable.");
  process.exit(1);
}

const projectJson = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "..", ".vercel", "project.json"),
    "utf8"
  )
);
const { projectId, orgId } = projectJson;
if (!projectId || !orgId) {
  console.error("Missing projectId/orgId in .vercel/project.json");
  process.exit(1);
}

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv();
const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GROQ_API_KEY",
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_DAILY_MESSAGE_LIMIT",
];

const baseUrl = `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${orgId}&upsert=true`;

for (const key of KEYS) {
  const value = env[key];
  if (!value) {
    console.log(`SKIP ${key} (not found in .env.local)`);
    continue;
  }
  const isSensitive = !key.startsWith("NEXT_PUBLIC_");
  const body = {
    key,
    value,
    type: isSensitive ? "encrypted" : "plain",
    target: ["production", "preview", "development"],
  };
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    console.log(`ok    ${key}`);
  } else {
    const text = await res.text();
    console.log(`FAIL  ${key} — ${res.status} ${text.slice(0, 200)}`);
  }
}

console.log("\nDone.");
