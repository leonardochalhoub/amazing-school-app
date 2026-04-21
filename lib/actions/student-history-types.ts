// Constants + types for the student_history feature. Kept separate from
// lib/actions/student-history.ts because that file has "use server" and
// Next.js forbids non-async exports from a server-actions module.

export const HISTORY_STATUSES = [
  "Planned",
  "Done",
  "Absent",
  "Rescheduled by student",
  "Rescheduled by teacher",
  "Make up class",
] as const;
export type HistoryStatus = (typeof HISTORY_STATUSES)[number];

export const SKILL_FOCUS_OPTIONS = [
  "Grammar",
  "Speaking",
  "Vocabulary",
  "Listening",
  "Reading",
  "Writing",
] as const;
export type SkillFocus = (typeof SKILL_FOCUS_OPTIONS)[number];

export interface StudentHistoryEntry {
  id: string;
  teacher_id: string;
  student_id: string | null;
  roster_student_id: string | null;
  classroom_id: string | null;
  event_date: string;
  event_time: string | null;
  /** Wall-clock end of the class (HH:mm:ss). When set together
   *  with event_time on a Done class, the database computes
   *  duration_minutes for live-class hour totals. */
  end_time: string | null;
  /** Generated column — minutes between event_time and end_time
   *  when status='Done'. Null otherwise. */
  duration_minutes: number | null;
  status: HistoryStatus;
  lesson_content: string | null;
  skill_focus: SkillFocus[];
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
}

/** Format a minute count as a friendly "1h 30min" / "45min" / "2h" string. */
export function formatHoursMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0min";
  const m = Math.round(totalMinutes);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}min`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}min`;
}
