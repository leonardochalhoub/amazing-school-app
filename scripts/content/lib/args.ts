import { CEFR_LEVELS, SKILLS, type CefrLevel, type Skill } from "@/lib/content/schema";

export interface RunArgs {
  cefr?: CefrLevel;
  skill?: Skill;
  budget?: number;
  resume: boolean;
  force: boolean;
}

export function parseArgs(argv: string[]): RunArgs {
  const out: RunArgs = { resume: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cefr") {
      const v = argv[++i];
      if (!(CEFR_LEVELS as readonly string[]).includes(v)) {
        throw new Error(`Invalid --cefr: ${v}. Valid: ${CEFR_LEVELS.join(", ")}`);
      }
      out.cefr = v as CefrLevel;
    } else if (a === "--skill") {
      const v = argv[++i];
      if (!(SKILLS as readonly string[]).includes(v)) {
        throw new Error(`Invalid --skill: ${v}. Valid: ${SKILLS.join(", ")}`);
      }
      out.skill = v as Skill;
    } else if (a === "--budget") {
      out.budget = Number(argv[++i]);
    } else if (a === "--resume") {
      out.resume = true;
    } else if (a === "--force") {
      out.force = true;
    }
  }
  return out;
}
