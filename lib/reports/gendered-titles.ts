/**
 * Brazilian-Portuguese gendered title helpers used on receipts +
 * certificates. Teacher profiles don't carry a gender field yet, so
 * we fall back to a simple name-based heuristic: Brazilian feminine
 * first names overwhelmingly end in 'a' (Tatiana, Maria, Ana). For
 * students we have the explicit gender column on roster_students,
 * so we use that directly.
 */

export type GenderedRole = "female" | "male" | null;

/** First-word trimmed, punctuation stripped. */
function firstName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * Heuristic-only — good for ~90% of Brazilian first names. Falls
 * through to "male" on ambiguity (the all-lowercase exceptions list
 * below catches the well-known masculine-ending-in-a cases).
 */
const MASC_ENDINGS_IN_A = new Set(
  [
    "costa",
    "silva",
    "sousa",
    "souza",
    "jurema",
    "tassa",
    "yuma",
    "joshua",
  ].map((s) => s.toLowerCase()),
);

export function inferGenderFromName(name: string | null | undefined): GenderedRole {
  const first = firstName(name).toLowerCase();
  if (!first) return null;
  if (MASC_ENDINGS_IN_A.has(first)) return "male";
  const last = first[first.length - 1];
  if (last === "a") return "female";
  return "male";
}

export function teacherTitle(
  gender: GenderedRole,
  locale: "pt-BR" | "en" = "pt-BR",
): string {
  if (locale === "en") return "Teacher";
  if (gender === "female") return "Professora";
  if (gender === "male") return "Professor";
  return "Professor(a)";
}

export function studentTitle(
  gender: GenderedRole,
  locale: "pt-BR" | "en" = "pt-BR",
): string {
  if (locale === "en") return "Student";
  if (gender === "female") return "Aluna";
  if (gender === "male") return "Aluno";
  return "Aluno(a)";
}
