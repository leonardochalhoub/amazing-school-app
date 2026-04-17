import fs from "node:fs";
import path from "node:path";
import { PUBLISH_DIR } from "../config";
import { Lesson, CEFR_LEVELS, cefrDir, type CefrLevel, toMeta } from "@/lib/content/schema";

export interface IndexStats {
  total: number;
  byCefr: Record<string, number>;
}

export function rebuildIndex(): IndexStats {
  const allMeta: ReturnType<typeof toMeta>[] = [];
  const byCefr: Record<string, string[]> = {};
  const byCefrCounts: Record<string, number> = {};

  for (const lvl of CEFR_LEVELS) {
    const dir = path.join(PUBLISH_DIR, cefrDir(lvl));
    byCefr[lvl] = [];
    byCefrCounts[lvl] = 0;
    if (!fs.existsSync(dir)) continue;

    for (const skill of fs.readdirSync(dir)) {
      const skillPath = path.join(dir, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      for (const file of fs.readdirSync(skillPath)) {
        if (!file.endsWith(".json")) continue;
        const raw = fs.readFileSync(path.join(skillPath, file), "utf8");
        const parsed = Lesson.safeParse(JSON.parse(raw));
        if (!parsed.success) continue;
        allMeta.push(toMeta(parsed.data));
        byCefr[lvl].push(parsed.data.slug);
        byCefrCounts[lvl]++;
      }
    }
  }

  allMeta.sort((a, b) => {
    if (a.cefr_level !== b.cefr_level) return a.cefr_level.localeCompare(b.cefr_level);
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.slug.localeCompare(b.slug);
  });

  fs.writeFileSync(
    path.join(PUBLISH_DIR, "index.json"),
    JSON.stringify(allMeta, null, 2) + "\n"
  );
  fs.writeFileSync(
    path.join(PUBLISH_DIR, "by-cefr.json"),
    JSON.stringify(byCefr, null, 2) + "\n"
  );

  return { total: allMeta.length, byCefr: byCefrCounts };
}

if (require.main === module) {
  const stats = rebuildIndex();
  console.log(JSON.stringify(stats, null, 2));
}
