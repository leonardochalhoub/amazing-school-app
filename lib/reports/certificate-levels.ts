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

/**
 * Full lookup table — includes legacy half-semester codes (x1_1 /
 * x1_2) so certificates issued under the old model still render
 * their labels correctly. The dropdown only offers the simplified
 * 9-entry set (see CERTIFICATE_LEVEL_CHOICES below).
 */
export const CERTIFICATE_LEVELS = [
  // Canonical set — what the dropdown shows today.
  { code: "a1", codeLabel: "A1", title: "Iniciante", en: "Beginner" },
  { code: "a2", codeLabel: "A2", title: "Pré-Intermediário", en: "Pre-Intermediate" },
  { code: "a", codeLabel: "A", title: "Básico", en: "Basic" },
  { code: "b1", codeLabel: "B1", title: "Intermediário", en: "Intermediate" },
  { code: "b2", codeLabel: "B2", title: "Intermediário Superior", en: "Upper-Intermediate" },
  { code: "b", codeLabel: "B", title: "Intermediário", en: "Intermediate" },
  { code: "c1", codeLabel: "C1", title: "Avançado", en: "Advanced" },
  { code: "c2", codeLabel: "C2", title: "Proficiente", en: "Proficient" },
  { code: "c", codeLabel: "C", title: "Avançado", en: "Advanced" },
  // Custom marker — used when the teacher issues a non-CEFR certificate
  // (e.g. "English for Tech Professionals"). The UI reads `title` for
  // the display name in that case.
  { code: "custom", codeLabel: "Custom", title: "Curso personalizado", en: "Custom course" },
  // Legacy half-semester codes — kept so older certificates still
  // find a label match via findCertificateLevel().
  { code: "a1_1", codeLabel: "A1.1", title: "Iniciante · 1º semestre", en: "Beginner · 1st semester" },
  { code: "a1_2", codeLabel: "A1.2", title: "Iniciante · 2º semestre", en: "Beginner · 2nd semester" },
  { code: "a2_1", codeLabel: "A2.1", title: "Pré-Intermediário · 1º semestre", en: "Pre-Intermediate · 1st semester" },
  { code: "a2_2", codeLabel: "A2.2", title: "Pré-Intermediário · 2º semestre", en: "Pre-Intermediate · 2nd semester" },
  { code: "b1_1", codeLabel: "B1.1", title: "Intermediário · 1º semestre", en: "Intermediate · 1st semester" },
  { code: "b1_2", codeLabel: "B1.2", title: "Intermediário · 2º semestre", en: "Intermediate · 2nd semester" },
  { code: "b2_1", codeLabel: "B2.1", title: "Intermediário Superior · 1º semestre", en: "Upper-Intermediate · 1st semester" },
  { code: "b2_2", codeLabel: "B2.2", title: "Intermediário Superior · 2º semestre", en: "Upper-Intermediate · 2nd semester" },
] as const;

export type CertificateLevelCode = (typeof CERTIFICATE_LEVELS)[number]["code"];

/** Codes actually offered in the issue-certificate dialog. Legacy
    half-semester variants are excluded so new certificates follow
    the simplified CEFR track + the custom escape hatch. */
export const CERTIFICATE_LEVEL_CHOICES = [
  "a1",
  "a2",
  "a",
  "b1",
  "b2",
  "b",
  "c1",
  "c2",
  "c",
] as const;

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
