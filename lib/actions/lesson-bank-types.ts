import type { ExerciseBlock } from "@/lib/actions/teacher-lessons-types";

export interface LessonBankEntryRow {
  id: string;
  teacher_lesson_id: string | null;
  author_id: string;
  title: string;
  slug: string;
  description: string | null;
  cefr_level: string | null;
  category: string | null;
  estimated_minutes: number | null;
  exercises: ExerciseBlock[];
  current_version: number;
  import_count: number;
  assign_count: number;
  spread_by: string | null;
  spread_source_id: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonBankVersionRow {
  id: string;
  bank_entry_id: string;
  version_no: number;
  title: string;
  description: string | null;
  cefr_level: string | null;
  category: string | null;
  estimated_minutes: number | null;
  exercises: ExerciseBlock[];
  change_note: string | null;
  created_at: string;
}

export interface LessonBankMigrationRow {
  id: string;
  bank_entry_id: string;
  teacher_id: string;
  local_lesson_id: string | null;
  synced_version: number;
  auto_sync: boolean;
  migrated_at: string;
}

export type SysadminMessageRole = "owner" | "teacher" | "student";
export type SysadminMessageStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "closed";

export interface SysadminMessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: SysadminMessageRole;
  recipient_id: string;
  subject: string | null;
  body: string;
  bank_entry_id: string | null;
  is_reply: boolean;
  status: SysadminMessageStatus;
  read_at: string | null;
  created_at: string;
}

export interface LessonBankEntryWithAuthor extends LessonBankEntryRow {
  author_name: string | null;
  author_email: string | null;
  migration?: LessonBankMigrationRow | null;
  unread_review_count?: number;
}
