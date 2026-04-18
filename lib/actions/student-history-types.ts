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
  status: HistoryStatus;
  lesson_content: string | null;
  skill_focus: SkillFocus[];
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
}
