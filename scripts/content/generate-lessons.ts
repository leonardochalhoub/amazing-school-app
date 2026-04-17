import fs from "node:fs";
import path from "node:path";
import { CHUNKS_DIR, GENERATED_DIR, MODELS, BUDGET, licenseForUrl } from "./config";
import { CostTracker } from "./lib/cost-tracker";
import { callClaude } from "./lib/claude";
import { createLogger } from "./lib/log";
import { newRunId, createManifest, writeManifest } from "./lib/manifest";
import { Lesson, cefrDir, CEFR_LEVELS, SKILLS, type CefrLevel, type Skill } from "@/lib/content/schema";

const PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, "prompts", "generate-lesson.md"),
  "utf8"
);

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const brace = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (brace >= 0 && last > brace) return trimmed.slice(brace, last + 1);
  return trimmed;
}

interface Target {
  cefr: CefrLevel;
  skill: Skill;
  slug: string;
  title: string;
  sources: { url: string; title: string; license: ReturnType<typeof licenseForUrl> }[];
  chunks: string[];
}

function loadTargets(cefrFilter?: CefrLevel, skillFilter?: Skill): Target[] {
  const targets: Target[] = [];
  if (!fs.existsSync(CHUNKS_DIR)) return targets;

  for (const lvl of CEFR_LEVELS) {
    if (cefrFilter && lvl !== cefrFilter) continue;
    const dir = path.join(CHUNKS_DIR, cefrDir(lvl));
    if (!fs.existsSync(dir)) continue;

    for (const skill of SKILLS) {
      if (skillFilter && skill !== skillFilter) continue;
      const skillDir = path.join(dir, skill);
      if (!fs.existsSync(skillDir)) continue;

      for (const file of fs.readdirSync(skillDir)) {
        if (!file.endsWith(".json")) continue;
        const data = JSON.parse(fs.readFileSync(path.join(skillDir, file), "utf8")) as {
          source?: string | null;
          chunks?: string[];
        };
        if (!data.chunks?.length) continue;

        const slug = `${lvl.replace(".", "-")}-${skill}-${file.replace(/\.json$/, "")}`;
        targets.push({
          cefr: lvl,
          skill,
          slug,
          title: `${skill[0].toUpperCase() + skill.slice(1)} (${lvl.toUpperCase()})`,
          sources: data.source
            ? [{ url: data.source, title: data.source, license: licenseForUrl(data.source) }]
            : [],
          chunks: data.chunks,
        });
      }
    }
  }
  return targets;
}

async function generateOne(
  target: Target,
  tracker: CostTracker,
  force: boolean
): Promise<{ ok: boolean; slug: string; reason?: string }> {
  const outDir = path.join(GENERATED_DIR, cefrDir(target.cefr), target.skill);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${target.slug}.json`);
  if (!force && fs.existsSync(outFile)) return { ok: true, slug: target.slug, reason: "skipped" };

  const prompt = render(PROMPT_TEMPLATE, {
    chunks: target.chunks
      .map((c, i) => `Passage ${i + 1} (${target.sources[0]?.url ?? "unknown"}):\n${c}`)
      .join("\n\n"),
    cefr_level: target.cefr,
    skill: target.skill,
    slug: target.slug,
    title: target.title,
  });

  const raw = await callClaude({
    model: MODELS.generate,
    prompt,
    tracker,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    return { ok: false, slug: target.slug, reason: "invalid-json" };
  }

  const candidate = {
    ...(parsed as Record<string, unknown>),
    slug: target.slug,
    cefr_level: target.cefr,
    category: target.skill,
    sources:
      ((parsed as { sources?: unknown[] }).sources?.length
        ? (parsed as { sources: unknown[] }).sources
        : target.sources) ?? target.sources,
    generator_model: MODELS.generate,
    generated_at: new Date().toISOString(),
  };

  const check = Lesson.safeParse(candidate);
  if (!check.success) {
    return {
      ok: false,
      slug: target.slug,
      reason: `schema-fail: ${check.error.issues[0]?.message ?? "unknown"}`,
    };
  }

  fs.writeFileSync(outFile, JSON.stringify(check.data, null, 2));
  return { ok: true, slug: target.slug };
}

async function main() {
  const cefrArg = process.argv.includes("--cefr")
    ? (process.argv[process.argv.indexOf("--cefr") + 1] as CefrLevel)
    : undefined;
  const skillArg = process.argv.includes("--skill")
    ? (process.argv[process.argv.indexOf("--skill") + 1] as Skill)
    : undefined;
  const force = process.argv.includes("--force");
  const budget = process.argv.includes("--budget")
    ? Number(process.argv[process.argv.indexOf("--budget") + 1])
    : BUDGET.usd;

  const runId = newRunId();
  const log = createLogger(runId, path.join(GENERATED_DIR, ".logs"));
  const manifest = createManifest(runId, { stage: "generate", cefr: cefrArg, skill: skillArg, budget });
  const tracker = new CostTracker(budget);

  const targets = loadTargets(cefrArg, skillArg);
  log.info("generate.start", { targets: targets.length, runId });

  let ok = 0, failed = 0;
  for (const t of targets) {
    try {
      const r = await generateOne(t, tracker, force);
      if (r.ok) ok++;
      else {
        failed++;
        manifest.rejected.push({ slug: t.slug, reason: r.reason ?? "unknown" });
      }
    } catch (err) {
      failed++;
      manifest.rejected.push({ slug: t.slug, reason: String(err) });
      log.error("generate.error", { slug: t.slug, err: String(err) });
      if (String(err).includes("Budget exceeded")) break;
    }
  }

  manifest.stages.generate = { ok, failed, skipped: 0 };
  manifest.cost = tracker.summary();
  manifest.totalUsd = tracker.spent;
  manifest.finishedAt = new Date().toISOString();
  writeManifest(manifest);
  log.info("generate.done", { ok, failed, spent: tracker.spent });
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { generateOne, loadTargets };
