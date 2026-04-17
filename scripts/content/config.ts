import path from "node:path";

export const ROOT = path.resolve(__dirname);
export const DATA_DIR = path.join(ROOT, "data");
export const RAW_DIR = path.join(DATA_DIR, "raw");
export const CHUNKS_DIR = path.join(DATA_DIR, "chunks");
export const GENERATED_DIR = path.join(DATA_DIR, "generated");
export const VALIDATED_DIR = path.join(DATA_DIR, "validated");
export const MANIFESTS_DIR = path.join(DATA_DIR, "manifests");
export const PUBLISH_DIR = path.resolve(__dirname, "..", "..", "content", "lessons");

export const MODELS = {
  generate: process.env.CONTENT_GEN_MODEL ?? "claude-sonnet-4-6",
  validate: process.env.CONTENT_VALIDATE_MODEL ?? "claude-haiku-4-5-20251001",
} as const;

export const BUDGET = {
  usd: Number(process.env.CONTENT_PIPELINE_BUDGET_USD ?? "5.00"),
  maxRetries: Number(process.env.CONTENT_PIPELINE_MAX_RETRIES ?? "5"),
};

export const ALLOWED_SOURCES = (
  process.env.CONTENT_ALLOWED_SOURCES ??
  "learnenglish.britishcouncil.org,learningenglish.voanews.com,en.wikibooks.org,www.gutenberg.org"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const SOURCE_LICENSES: Record<string, "cc-by" | "cc-by-sa" | "cc-by-nc" | "public-domain"> = {
  "learnenglish.britishcouncil.org": "cc-by-nc",
  "learningenglish.voanews.com": "public-domain",
  "en.wikibooks.org": "cc-by-sa",
  "www.gutenberg.org": "public-domain",
};

export function licenseForUrl(url: string): "cc-by" | "cc-by-sa" | "cc-by-nc" | "public-domain" {
  try {
    const host = new URL(url).host;
    return SOURCE_LICENSES[host] ?? "public-domain";
  } catch {
    return "public-domain";
  }
}

export function isAllowedSource(url: string): boolean {
  try {
    const host = new URL(url).host;
    return ALLOWED_SOURCES.includes(host);
  } catch {
    return false;
  }
}
