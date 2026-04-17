import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ALLOWED_SOURCES, RAW_DIR, isAllowedSource } from "./config";
import { createLogger } from "./lib/log";
import { newRunId } from "./lib/manifest";

interface Target {
  url: string;
  cefr: string;
  skill: string;
}

function hashUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

async function fetchOne(target: Target, force: boolean): Promise<{ ok: boolean; path: string; skipped?: boolean }> {
  if (!isAllowedSource(target.url)) {
    return { ok: false, path: target.url };
  }
  const dir = path.join(RAW_DIR, target.cefr.replace(".", "-"), target.skill);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${hashUrl(target.url)}.html`);
  if (!force && fs.existsSync(out)) return { ok: true, path: out, skipped: true };

  const res = await fetch(target.url, {
    headers: { "User-Agent": "amazing-school-content-pipeline/0.2 (MIT)" },
  });
  if (!res.ok) return { ok: false, path: out };
  const body = await res.text();
  fs.writeFileSync(out, `<!-- source:${target.url} -->\n${body}`);
  return { ok: true, path: out };
}

async function main() {
  const runId = newRunId();
  const log = createLogger(runId, path.join(RAW_DIR, ".logs"));
  log.info("fetch-sources.start", { allowed: ALLOWED_SOURCES });

  const targetsFile = process.argv.includes("--from")
    ? process.argv[process.argv.indexOf("--from") + 1]
    : path.join(__dirname, "targets.json");

  if (!fs.existsSync(targetsFile)) {
    log.warn("fetch-sources.no-targets-file", { targetsFile });
    console.log(
      `Create ${targetsFile} with an array of {url, cefr, skill} objects, then rerun.`
    );
    return;
  }
  const targets: Target[] = JSON.parse(fs.readFileSync(targetsFile, "utf8"));
  const force = process.argv.includes("--force");

  let ok = 0, skipped = 0, failed = 0;
  for (const t of targets) {
    try {
      const r = await fetchOne(t, force);
      if (r.skipped) skipped++;
      else if (r.ok) ok++;
      else failed++;
    } catch (err) {
      failed++;
      log.warn("fetch-sources.failed", { url: t.url, err: String(err) });
    }
  }

  log.info("fetch-sources.done", { ok, skipped, failed });
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { fetchOne };
