import fs from "node:fs";
import path from "node:path";
import { VALIDATED_DIR, PUBLISH_DIR } from "./config";
import { rebuildIndex } from "./lib/rebuild-index";
import { Lesson } from "@/lib/content/schema";

function copyValidatedToPublished(): { published: number; skipped: number } {
  let published = 0, skipped = 0;
  if (!fs.existsSync(VALIDATED_DIR)) return { published, skipped };

  for (const cefrDirName of fs.readdirSync(VALIDATED_DIR)) {
    const cefrPath = path.join(VALIDATED_DIR, cefrDirName);
    if (!fs.statSync(cefrPath).isDirectory() || cefrDirName.startsWith(".")) continue;
    for (const skill of fs.readdirSync(cefrPath)) {
      const skillPath = path.join(cefrPath, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      for (const file of fs.readdirSync(skillPath)) {
        if (!file.endsWith(".json")) continue;
        const src = path.join(skillPath, file);
        const parsed = Lesson.safeParse(JSON.parse(fs.readFileSync(src, "utf8")));
        if (!parsed.success) {
          skipped++;
          continue;
        }
        const destDir = path.join(PUBLISH_DIR, cefrDirName, skill);
        fs.mkdirSync(destDir, { recursive: true });
        const dest = path.join(destDir, `${parsed.data.slug}.json`);
        fs.writeFileSync(dest, JSON.stringify(parsed.data, null, 2));
        published++;
      }
    }
  }
  return { published, skipped };
}

async function main() {
  const { published, skipped } = copyValidatedToPublished();
  const indexStats = rebuildIndex();
  console.log(
    JSON.stringify(
      {
        published,
        skipped,
        indexedLessons: indexStats.total,
        byCefr: indexStats.byCefr,
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { copyValidatedToPublished };
