import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}

const [, , rosterId] = process.argv;
if (!rosterId) {
  console.error("Usage: node scripts/seed-roster-avatar.mjs <roster_id>");
  process.exit(1);
}

// Hand-drawn cartoon SVG — teen girl with warm smile, soft palette.
const svg = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fde7f0"/>
      <stop offset="1" stop-color="#d9c9f5"/>
    </linearGradient>
    <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4e342e"/>
      <stop offset="1" stop-color="#6d4c41"/>
    </linearGradient>
    <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7e57c2"/>
      <stop offset="1" stop-color="#5e35b1"/>
    </linearGradient>
    <radialGradient id="cheek" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#f48fb1" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#f48fb1" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- soft sparkles in bg -->
  <g opacity="0.55" fill="#ffffff">
    <circle cx="80" cy="90" r="3"/>
    <circle cx="440" cy="120" r="2.5"/>
    <circle cx="410" cy="60" r="2"/>
    <circle cx="60" cy="180" r="2"/>
    <circle cx="470" cy="200" r="3"/>
    <circle cx="430" cy="350" r="2.5"/>
    <circle cx="90" cy="360" r="2"/>
  </g>

  <!-- Shoulders + shirt -->
  <path d="M 80 512 Q 80 390 256 380 Q 432 390 432 512 Z" fill="url(#shirt)"/>
  <path d="M 200 512 Q 200 420 256 412 Q 312 420 312 512 Z" fill="#ffffff" opacity="0.18"/>

  <!-- Neck -->
  <path d="M 228 310 Q 228 360 256 372 Q 284 360 284 310 Z" fill="#ffccbc"/>

  <!-- Hair back layer -->
  <path d="M 130 240 Q 130 110 256 98 Q 382 110 382 240 Q 382 320 352 340 L 352 220 Q 330 170 256 168 Q 182 170 160 220 L 160 340 Q 130 320 130 240 Z" fill="url(#hair)"/>

  <!-- Face -->
  <ellipse cx="256" cy="235" rx="108" ry="128" fill="#ffd1bd"/>

  <!-- Bangs + fringe -->
  <path d="M 148 180 Q 210 128 256 128 Q 302 128 364 180 Q 350 208 300 198 Q 256 186 212 198 Q 162 208 148 180 Z" fill="url(#hair)"/>
  <path d="M 190 165 Q 230 188 270 176" stroke="#3e2723" stroke-width="2" fill="none" opacity="0.4"/>

  <!-- Ears -->
  <ellipse cx="145" cy="245" rx="12" ry="20" fill="#ffccbc"/>
  <ellipse cx="367" cy="245" rx="12" ry="20" fill="#ffccbc"/>

  <!-- Earrings -->
  <circle cx="145" cy="265" r="4" fill="#ffd54f"/>
  <circle cx="367" cy="265" r="4" fill="#ffd54f"/>

  <!-- Cheeks -->
  <circle cx="188" cy="268" r="22" fill="url(#cheek)"/>
  <circle cx="324" cy="268" r="22" fill="url(#cheek)"/>

  <!-- Eyebrows -->
  <path d="M 196 218 Q 218 210 240 220" stroke="#3e2723" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M 272 220 Q 294 210 316 218" stroke="#3e2723" stroke-width="5" fill="none" stroke-linecap="round"/>

  <!-- Eyes -->
  <g>
    <ellipse cx="218" cy="248" rx="11" ry="13" fill="#1a1a1a"/>
    <ellipse cx="294" cy="248" rx="11" ry="13" fill="#1a1a1a"/>
    <!-- Iris sparkle -->
    <circle cx="222" cy="243" r="3.5" fill="#ffffff"/>
    <circle cx="298" cy="243" r="3.5" fill="#ffffff"/>
    <circle cx="215" cy="253" r="1.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="291" cy="253" r="1.5" fill="#ffffff" opacity="0.8"/>
  </g>

  <!-- Eyelashes -->
  <path d="M 209 240 L 205 234" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <path d="M 227 240 L 231 234" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <path d="M 285 240 L 281 234" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <path d="M 303 240 L 307 234" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>

  <!-- Nose -->
  <path d="M 256 258 Q 250 280 252 288 Q 256 292 260 288 Q 262 280 256 258" fill="#f4a89a" opacity="0.6"/>

  <!-- Smile -->
  <path d="M 222 300 Q 256 328 290 300" stroke="#5d4037" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M 230 304 Q 256 318 282 304 L 282 304 Q 256 316 230 304 Z" fill="#ef9a9a" opacity="0.9"/>
  <path d="M 232 306 Q 256 310 280 306" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5"/>

  <!-- Collar -->
  <path d="M 210 410 Q 256 420 302 410 Q 292 430 256 434 Q 220 430 210 410 Z" fill="#ffffff" opacity="0.3"/>
</svg>
`.trim();

const webp = await sharp(Buffer.from(svg))
  .resize(512, 512, { fit: "cover" })
  .webp({ quality: 88 })
  .toBuffer();

// Upload via storage REST
const uploadRes = await fetch(
  `${URL}/storage/v1/object/avatars/roster/${rosterId}.webp`,
  {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "image/webp",
      "x-upsert": "true",
    },
    body: webp,
  }
);
if (!uploadRes.ok) {
  console.error("Upload failed:", uploadRes.status, await uploadRes.text());
  process.exit(1);
}

// Mark has_avatar
const patchRes = await fetch(
  `${URL}/rest/v1/roster_students?id=eq.${rosterId}`,
  {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ has_avatar: true }),
  }
);
if (!patchRes.ok) {
  console.error("Patch failed:", patchRes.status, await patchRes.text());
  process.exit(1);
}

console.log(`Avatar uploaded for roster_student ${rosterId}`);
