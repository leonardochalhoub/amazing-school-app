import fs from "node:fs";
import path from "node:path";
import { GENERATED_DIR, VALIDATED_DIR, MODELS, BUDGET } from "./config";
import { CostTracker } from "./lib/cost-tracker";
import { callClaude } from "./lib/claude";
import { createLogger } from "./lib/log";
import { newRunId, createManifest, writeManifest } from "./lib/manifest";
import { Lesson } from "@/lib/content/schema";

const PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, "prompts", "validate-lesson.md"),
  "utf8"
);

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function extractJson(text: string): string {
  const t = text.trim();
  if (t.startsWith("{")) return t;
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const brace = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (brace >= 0 && last > brace) return t.slice(brace, last + 1);
  return t;
}

async function validateOne(
  file: string,
  outFile: string,
  tracker: CostTracker
): Promise<{ ok: boolean; reason?: string }> {
  const raw = fs.readFileSync(file, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  const schemaCheck = Lesson.safeParse(parsed);
  if (!schemaCheck.success) {
    return { ok: false, reason: `schema: ${schemaCheck.error.issues[0]?.message ?? ""}` };
  }

  const response = await callClaude({
    model: MODELS.validate,
    prompt: render(PROMPT_TEMPLATE, { lesson_json: JSON.stringify(schemaCheck.data, null, 2) }),
    tracker,
    maxOutputTokens: 400,
  });

  let verdict: { accepted?: boolean; reasons?: string[] };
  try {
    verdict = JSON.parse(extractJson(response));
  } catch {
    return { ok: false, reason: "validator-non-json" };
  }
  if (verdict.accepted !== true) {
    return {
      ok: false,
      reason: `rejected: ${(verdict.reasons ?? []).join("; ") || "validator"}`,
    };
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(schemaCheck.data, null, 2));
  return { ok: true };
}

async function main() {
  const runId = newRunId();
  const log = createLogger(runId, path.join(VALIDATED_DIR, ".logs"));
  const manifest = createManifest(runId, { stage: "validate" });
  const tracker = new CostTracker(BUDGET.usd);

  if (!fs.existsSync(GENERATED_DIR)) {
    log.warn("validate.empty", { path: GENERATED_DIR });
    return;
  }

  let ok = 0, failed = 0;
  for (const cefrDirName of fs.readdirSync(GENERATED_DIR)) {
    const cefrPath = path.join(GENERATED_DIR, cefrDirName);
    if (!fs.statSync(cefrPath).isDirectory() || cefrDirName.startsWith(".")) continue;
    for (const skill of fs.readdirSync(cefrPath)) {
      const skillPath = path.join(cefrPath, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      for (const file of fs.readdirSync(skillPath)) {
        if (!file.endsWith(".json")) continue;
        const src = path.join(skillPath, file);
        const out = path.join(VALIDATED_DIR, cefrDirName, skill, file);
        try {
          const r = await validateOne(src, out, tracker);
          if (r.ok) ok++;
          else {
            failed++;
            manifest.rejected.push({ slug: file.replace(/\.json$/, ""), reason: r.reason ?? "unknown" });
          }
        } catch (err) {
          failed++;
          log.error("validate.error", { file: src, err: String(err) });
          if (String(err).includes("Budget exceeded")) break;
        }
      }
    }
  }

  manifest.stages.validate = { ok, failed, skipped: 0 };
  manifest.cost = tracker.summary();
  manifest.totalUsd = tracker.spent;
  manifest.finishedAt = new Date().toISOString();
  writeManifest(manifest);
  log.info("validate.done", { ok, failed, spent: tracker.spent });
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { validateOne };
