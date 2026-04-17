import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "..", "supabase", "migrations");

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!TOKEN || !URL) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const refMatch = URL.match(/^https?:\/\/([^.]+)\./);
if (!refMatch) {
  console.error("Could not parse project ref from URL:", URL);
  process.exit(1);
}
const REF = refMatch[1];

const ONLY = process.argv.slice(2);

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => /^\d+_.*\.sql$/.test(f))
  .sort();

const selected = ONLY.length
  ? files.filter((f) => ONLY.some((o) => f.startsWith(o)))
  : files;

console.log(`Target project: ${REF}`);
console.log(`Applying ${selected.length} migration(s):`, selected);

for (const file of selected) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  process.stdout.write(`→ ${file} ... `);
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    const text = await res.text();
    if (!res.ok) {
      console.log(`FAILED (${res.status})`);
      console.log(text);
      process.exit(1);
    }
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    console.error(err);
    process.exit(1);
  }
}

console.log("\nAll migrations applied.");
