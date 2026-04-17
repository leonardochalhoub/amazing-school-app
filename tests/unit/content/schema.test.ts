import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Lesson, CEFR_LEVELS, cefrDir } from "@/lib/content/schema";

const CONTENT_ROOT = path.resolve(process.cwd(), "content/lessons");

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".json") && !["index.json", "by-cefr.json"].includes(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("published lesson JSON", () => {
  const files = walk(CONTENT_ROOT);

  it("has at least one lesson file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every file is in a valid CEFR directory", () => {
    for (const f of files) {
      const rel = path.relative(CONTENT_ROOT, f);
      const cefr = rel.split(path.sep)[0];
      const validDirs = CEFR_LEVELS.map(cefrDir);
      expect(validDirs).toContain(cefr);
    }
  });

  it("every file parses against the Lesson schema", () => {
    for (const f of files) {
      const raw = JSON.parse(fs.readFileSync(f, "utf8"));
      const result = Lesson.safeParse(raw);
      if (!result.success) {
        throw new Error(
          `Schema failure in ${f}: ${result.error.issues.map((i) => i.message).join("; ")}`
        );
      }
    }
  });

  it("index.json slug set matches filesystem", () => {
    const index = JSON.parse(
      fs.readFileSync(path.join(CONTENT_ROOT, "index.json"), "utf8")
    ) as { slug: string }[];
    const indexSlugs = new Set(index.map((l) => l.slug));
    const fsSlugs = new Set(
      files.map((f) => path.basename(f).replace(/\.json$/, ""))
    );
    for (const s of indexSlugs) expect(fsSlugs).toContain(s);
    for (const s of fsSlugs) expect(indexSlugs).toContain(s);
  });
});
