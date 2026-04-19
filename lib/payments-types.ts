/**
 * Non-"use server" module holding payment types + sync helpers. Kept
 * separate from lib/actions/payments.ts because a "use server" file is
 * only allowed to export async functions — any type / const / sync
 * helper must live here and be re-exported by components as needed.
 */

export interface StudentPaymentRow {
  id: string;
  roster_student_id: string;
  teacher_id: string;
  billing_month: string;
  amount_cents: number | null;
  currency: string;
  paid: boolean;
  paid_at: string | null;
  due_marked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementRow {
  roster_student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  classroom_name: string | null;
  has_auth: boolean;
  monthly_tuition_cents: number | null;
  billing_day: number | null;
  billing_starts_on: string | null;
  /** Last day of studies — when set, the matrix locks cells after it. */
  ended_on: string | null;
  /** Fallback floor for the matrix when billing_starts_on is unset. */
  roster_created_at: string;
  payments: Record<string, StudentPaymentRow | null>;
}

export interface ManagementData {
  months: string[]; // newest first (YYYY-MM-01)
  rows: ManagementRow[];
}

/**
 * Click-cycle state model used by the Management grid:
 *   none → due → paid → none
 * - `none`  = no row, or row exists but paid=false AND due_marked_at IS NULL
 * - `due`   = paid=false, due_marked_at IS NOT NULL (yellow square)
 * - `paid`  = paid=true (green square)
 */
export type PaymentCellState = "none" | "due" | "paid";

export function cellStateOf(row: StudentPaymentRow | null): PaymentCellState {
  if (!row) return "none";
  if (row.paid) return "paid";
  if (row.due_marked_at) return "due";
  return "none";
}
