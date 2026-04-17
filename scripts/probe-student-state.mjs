#!/usr/bin/env node
// Quick diagnostic: for each signed-up student user, show their
// classroom membership + roster link + visible assignments.

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
const TOKEN = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
const URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!TOKEN || !URL) {
  console.error("missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}
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

console.log("--- profiles (students) ---");
console.log(
  await sql(
    "SELECT id, full_name, role FROM profiles WHERE role = 'student' ORDER BY full_name LIMIT 50"
  )
);

console.log("\n--- classroom_members ---");
console.log(
  await sql(
    "SELECT cm.classroom_id, cm.student_id, p.full_name, c.name AS classroom FROM classroom_members cm JOIN profiles p ON p.id = cm.student_id JOIN classrooms c ON c.id = cm.classroom_id ORDER BY c.name, p.full_name"
  )
);

console.log("\n--- roster_students (with auth_user_id) ---");
console.log(
  await sql(
    "SELECT id, full_name, email, classroom_id, auth_user_id FROM roster_students ORDER BY full_name LIMIT 50"
  )
);

console.log("\n--- lesson_assignments (last 20) ---");
console.log(
  await sql(
    "SELECT id, classroom_id, student_id, roster_student_id, lesson_slug, status, assigned_at FROM lesson_assignments ORDER BY assigned_at DESC LIMIT 20"
  )
);

console.log("\n--- recent student_invitations ---");
console.log(
  await sql(
    "SELECT id, teacher_id, classroom_id, roster_student_id, email, accepted_at, accepted_by_user_id FROM student_invitations ORDER BY created_at DESC LIMIT 10"
  )
);
