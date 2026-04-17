import fs from "node:fs";
import path from "node:path";
import { RAW_DIR, CHUNKS_DIR } from "./config";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSource(html: string): string | null {
  const m = html.match(/<!--\s*source:(.+?)\s*-->/);
  return m ? m[1].trim() : null;
}

function chunk(text: string, maxChars = 1200): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > maxChars) {
      if (cur) chunks.push(cur.trim());
      cur = s;
    } else {
      cur = cur ? cur + " " + s : s;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

async function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.log("Nothing to chunk — run fetch-sources first.");
    return;
  }

  const entries: Array<{ cefrDir: string; skill: string; file: string }> = [];
  for (const cefrDir of fs.readdirSync(RAW_DIR)) {
    const cefrPath = path.join(RAW_DIR, cefrDir);
    if (!fs.statSync(cefrPath).isDirectory() || cefrDir.startsWith(".")) continue;
    for (const skill of fs.readdirSync(cefrPath)) {
      const skillPath = path.join(cefrPath, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      for (const file of fs.readdirSync(skillPath)) {
        if (file.endsWith(".html")) entries.push({ cefrDir, skill, file });
      }
    }
  }

  for (const entry of entries) {
    const src = path.join(RAW_DIR, entry.cefrDir, entry.skill, entry.file);
    const html = fs.readFileSync(src, "utf8");
    const text = stripHtml(html);
    const sourceUrl = extractSource(html);
    const chunks = chunk(text);

    const outDir = path.join(CHUNKS_DIR, entry.cefrDir, entry.skill);
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, entry.file.replace(/\.html$/, ".json"));
    fs.writeFileSync(
      out,
      JSON.stringify(
        { source: sourceUrl, chunks, chars: text.length },
        null,
        2
      )
    );
    console.log(`chunked ${entry.cefrDir}/${entry.skill}/${entry.file} (${chunks.length} chunks)`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { stripHtml, chunk };
