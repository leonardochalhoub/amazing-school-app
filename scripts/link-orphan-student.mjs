#!/usr/bin/env node
// One-shot repair: link a signed-up student to a pending roster row when
// they signed up directly instead of going through the invite link.
//
// Usage: node scripts/link-orphan-student.mjs <authUserId> <rosterId> <invitationId?>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const p = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const env = loadEnv();
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ref = URL.match(/^https?:\/\/([^.]+)\./)[1];

async function sql(query) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  return r.json();
}

const [, , authUserId, rosterId, invitationId] = process.argv;
if (!authUserId || !rosterId) {
  console.error(
    "usage: node scripts/link-orphan-student.mjs <authUserId> <rosterId> [invitationId]"
  );
  process.exit(1);
}

const roster = await sql(
  `SELECT id, full_name, classroom_id FROM roster_students WHERE id = '${rosterId}'`
);
if (!Array.isArray(roster) || roster.length === 0) {
  console.error("roster row not found:", roster);
  process.exit(1);
}
const classroomId = roster[0].classroom_id;

console.log(`Linking auth user ${authUserId} → roster ${rosterId}`);
console.log(`  classroom: ${classroomId}`);
console.log(`  student:   ${roster[0].full_name}`);

await sql(
  `UPDATE roster_students SET auth_user_id = '${authUserId}' WHERE id = '${rosterId}'`
);
console.log("  ✓ roster_students.auth_user_id set");

if (classroomId) {
  await sql(
    `INSERT INTO classroom_members (classroom_id, student_id) VALUES ('${classroomId}', '${authUserId}') ON CONFLICT (classroom_id, student_id) DO NOTHING`
  );
  console.log("  ✓ classroom_members row ensured");
}

if (invitationId) {
  await sql(
    `UPDATE student_invitations SET accepted_at = now(), accepted_by_user_id = '${authUserId}' WHERE id = '${invitationId}' AND accepted_at IS NULL`
  );
  console.log("  ✓ invitation marked accepted");
}

console.log("\nDone.");
