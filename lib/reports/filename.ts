/**
 * Filename helpers for /print/* reports. The filename we hand back is
 * what browsers use as the default "Save as PDF" name when the URL's
 * `<title>` tag is set to this same string.
 *
 * Rules we follow:
 *  - ASCII-only (no accents) — some mobile browsers choke otherwise
 *  - Spaces → hyphens, no consecutive hyphens
 *  - Lowercase words, but preserve year numbers
 *  - Max 80 chars — anything longer is dropped by the trailing parts
 */

export function slugifyForFilename(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function reportFilename(
  parts: Array<string | number | null | undefined>,
): string {
  const cleaned = parts
    .filter((p): p is string | number => p !== null && p !== undefined && p !== "")
    .map((p) => slugifyForFilename(String(p)));
  return cleaned.join("--") || "amazing-school-report";
}
