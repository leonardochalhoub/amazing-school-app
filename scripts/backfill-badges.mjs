#!/usr/bin/env node
// One-shot backfill: for every row in `profiles` with role='student',
// evaluate the same unlock rules that `awardEligibleBadges` uses and
// insert any missing rows into `badges`. Idempotent — safe to re-run.
//
// Usage: node scripts/backfill-badges.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// .env.local.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Mirror the catalog + engine locally so this script has no TS build
// dependency. Keep in sync with lib/gamification/config.ts and engine.ts.
const BADGE_DEFINITIONS = [
  { type: "welcome_aboard", unlock: { kind: "auto" } },
  { type: "first_lesson", unlock: { kind: "count", counter: "lessons_completed", threshold: 1 } },
  { type: "first_chat", unlock: { kind: "count", counter: "conversations", threshold: 1 } },
  { type: "five_lessons", unlock: { kind: "count", counter: "lessons_completed", threshold: 5 } },
  { type: "bookworm", unlock: { kind: "count", counter: "lessons_completed", threshold: 25 } },
  { type: "streak_7", unlock: { kind: "streak", days: 7 } },
  { type: "streak_30", unlock: { kind: "streak", days: 30 } },
  { type: "streak_90", unlock: { kind: "streak", days: 90 } },
  { type: "music_lover", unlock: { kind: "count", counter: "music_completed", threshold: 5 } },
  { type: "level_5", unlock: { kind: "level", level: 5 } },
  { type: "level_10", unlock: { kind: "level", level: 10 } },
  { type: "level_25", unlock: { kind: "level", level: 25 } },
  { type: "level_50", unlock: { kind: "level", level: 50 } },
  { type: "perfect_lesson", unlock: { kind: "count", counter: "perfect_lessons", threshold: 1 } },
];

function xpToCross(fromLevel) {
  if (fromLevel < 1) return 0;
  return 50 * fromLevel * fromLevel + 50 * fromLevel;
}
const CACHE = [0, 0];
function cumulativeXpForLevel(level) {
  if (level <= 1) return 0;
  for (let i = CACHE.length; i <= level; i++)
    CACHE[i] = CACHE[i - 1] + xpToCross(i - 1);
  return CACHE[level];
}
function getLevel(totalXp) {
  if (totalXp <= 0) return 1;
  let lvl = 1;
  while (lvl < 60 && totalXp >= cumulativeXpForLevel(lvl + 1)) lvl++;
  return lvl;
}
function computeStreak(activities) {
  if (activities.length === 0) return 0;
  const dates = activities.map((a) => a.activity_date).sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
}

async function evaluateFor(studentId) {
  const [xpRes, actRes, progRes, existRes] = await Promise.all([
    admin
      .from("xp_events")
      .select("xp_amount, source")
      .eq("student_id", studentId),
    admin
      .from("daily_activity")
      .select("activity_date")
      .eq("student_id", studentId)
      .order("activity_date", { ascending: false })
      .limit(365),
    admin
      .from("lesson_progress")
      .select("lesson_slug, completed_at")
      .eq("student_id", studentId)
      .not("completed_at", "is", null),
    admin.from("badges").select("badge_type").eq("student_id", studentId),
  ]);

  const xpRows = xpRes.data ?? [];
  const activities = actRes.data ?? [];
  const progress = progRes.data ?? [];
  const existing = new Set((existRes.data ?? []).map((b) => b.badge_type));

  const totalXp = xpRows.reduce((s, e) => s + (e.xp_amount ?? 0), 0);
  const level = getLevel(totalXp);
  const streak = computeStreak(activities);
  const lessons = progress.filter((r) => !String(r.lesson_slug).startsWith("music:")).length;
  const music = progress.filter((r) => String(r.lesson_slug).startsWith("music:")).length;
  const chats = xpRows.filter((e) => e.source === "ai_chat").length;

  const toInsert = [];
  for (const b of BADGE_DEFINITIONS) {
    if (existing.has(b.type)) continue;
    const r = b.unlock;
    let ok = false;
    if (r.kind === "auto") ok = true;
    else if (r.kind === "level") ok = level >= r.level;
    else if (r.kind === "streak") ok = streak >= r.days;
    else if (r.kind === "count") {
      if (r.counter === "lessons_completed") ok = lessons >= r.threshold;
      else if (r.counter === "music_completed") ok = music >= r.threshold;
      else if (r.counter === "conversations") ok = chats >= r.threshold;
    }
    if (ok) toInsert.push({ student_id: studentId, badge_type: b.type });
  }

  if (toInsert.length === 0) return [];
  const { error } = await admin
    .from("badges")
    .upsert(toInsert, { onConflict: "student_id,badge_type", ignoreDuplicates: true });
  if (error) {
    console.error(`  ✗ upsert error for ${studentId}:`, error.message);
    return [];
  }
  return toInsert.map((r) => r.badge_type);
}

async function main() {
  const { data: students, error } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student");
  if (error) {
    console.error("Could not read profiles:", error.message);
    process.exit(1);
  }
  console.log(`Evaluating badges for ${students.length} students…`);
  let awardedTotal = 0;
  for (const s of students) {
    const awarded = await evaluateFor(s.id);
    if (awarded.length > 0) {
      awardedTotal += awarded.length;
      console.log(`  + ${s.full_name}: ${awarded.join(", ")}`);
    }
  }
  console.log(`Done. ${awardedTotal} badges awarded across ${students.length} students.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
