/**
 * CEFR → course-name mapping used on certificate labels. Each level
 * exposes three forms:
 *
 *   - codeLabel: what prints on the certificate, e.g. "B1.2"
 *   - title:     human-readable pt-BR course + semester, e.g.
 *                "Intermediário · 2º semestre"
 *   - en:        English equivalent rendered as the bilingual line.
 *
 * Sub-semester codes (X.1 / X.2) are optional — teachers can also
 * issue a full-level certificate (plain "B1" etc.) when they
 * condensed two semesters into one.
 */

export const CERTIFICATE_LEVELS = [
  { code: "a1_1", codeLabel: "A1.1", title: "Iniciante · 1º semestre", en: "Beginner · 1st semester" },
  { code: "a1_2", codeLabel: "A1.2", title: "Iniciante · 2º semestre", en: "Beginner · 2nd semester" },
  { code: "a1", codeLabel: "A1", title: "Iniciante · completo", en: "Beginner · full year" },
  { code: "a2_1", codeLabel: "A2.1", title: "Pré-Intermediário · 1º semestre", en: "Pre-Intermediate · 1st semester" },
  { code: "a2_2", codeLabel: "A2.2", title: "Pré-Intermediário · 2º semestre", en: "Pre-Intermediate · 2nd semester" },
  { code: "a2", codeLabel: "A2", title: "Pré-Intermediário · completo", en: "Pre-Intermediate · full year" },
  { code: "b1_1", codeLabel: "B1.1", title: "Intermediário · 1º semestre", en: "Intermediate · 1st semester" },
  { code: "b1_2", codeLabel: "B1.2", title: "Intermediário · 2º semestre", en: "Intermediate · 2nd semester" },
  { code: "b1", codeLabel: "B1", title: "Intermediário · completo", en: "Intermediate · full year" },
  { code: "b2_1", codeLabel: "B2.1", title: "Intermediário Superior · 1º semestre", en: "Upper-Intermediate · 1st semester" },
  { code: "b2_2", codeLabel: "B2.2", title: "Intermediário Superior · 2º semestre", en: "Upper-Intermediate · 2nd semester" },
  { code: "b2", codeLabel: "B2", title: "Intermediário Superior · completo", en: "Upper-Intermediate · full year" },
  { code: "c1", codeLabel: "C1", title: "Avançado", en: "Advanced" },
  { code: "c2", codeLabel: "C2", title: "Proficiente", en: "Proficient" },
] as const;

export type CertificateLevelCode = (typeof CERTIFICATE_LEVELS)[number]["code"];

export function findCertificateLevel(
  code: string,
): (typeof CERTIFICATE_LEVELS)[number] | null {
  return CERTIFICATE_LEVELS.find((l) => l.code === code) ?? null;
}

export const GRADE_OPTIONS = [
  {
    value: "A",
    label: "A — Excelente",
    caption: "Excelente",
    color: "#059669", // emerald
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    value: "B",
    label: "B — Muito bom",
    caption: "Muito bom",
    color: "#2563eb", // blue
    gradient: "from-sky-500/20 to-sky-500/5",
  },
  {
    value: "C",
    label: "C — Satisfatório",
    caption: "Satisfatório",
    color: "#d97706", // amber
    gradient: "from-amber-500/20 to-amber-500/5",
  },
] as const;

export type Grade = (typeof GRADE_OPTIONS)[number]["value"];

export function findGrade(value: string): (typeof GRADE_OPTIONS)[number] | null {
  return GRADE_OPTIONS.find((g) => g.value === value) ?? null;
}
