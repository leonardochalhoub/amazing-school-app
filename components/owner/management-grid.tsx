"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  cyclePaymentState,
  setStudentTuition,
  cellStateOf,
  type ManagementRow,
  type PaymentCellState,
  type StudentPaymentRow,
} from "@/lib/actions/payments";

interface Props {
  months: string[]; // newest first (YYYY-MM-01)
  rows: ManagementRow[];
}

function monthShort(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
function monthLong(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const BRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);

export function ManagementGrid({ months, rows }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.teacher_name.toLowerCase().includes(q) ||
        (r.classroom_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  // ASC order (oldest on the left) — reads naturally left-to-right
  // through time. Current month + next month live on the right edge.
  const orderedMonths = useMemo(() => [...months].reverse(), [months]);

  function cycle(rosterId: string, month: string) {
    const key = `cell-${rosterId}|${month}`;
    setPendingCell(key);
    cyclePaymentState({
      rosterStudentId: rosterId,
      billingMonth: month,
    }).then((res) => {
      setPendingCell(null);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function saveAmount(rosterId: string, value: string, billingDay: number | null) {
    const brl = Number(value.replace(",", "."));
    if (!Number.isFinite(brl) || brl < 0) {
      toast.error("Invalid amount");
      return;
    }
    const cents = Math.round(brl * 100);
    const key = `amt-${rosterId}`;
    setPendingCell(key);
    setStudentTuition({
      rosterStudentId: rosterId,
      monthlyAmountCents: cents > 0 ? cents : null,
      billingDay,
      startsOn: null,
    }).then((res) => {
      setPendingCell(null);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function saveDay(rosterId: string, value: string, amountCents: number | null) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 28) {
      toast.error("Due day must be between 1 and 28");
      return;
    }
    const key = `day-${rosterId}`;
    setPendingCell(key);
    setStudentTuition({
      rosterStudentId: rosterId,
      monthlyAmountCents: amountCents,
      billingDay: n,
      startsOn: null,
    }).then((res) => {
      setPendingCell(null);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by student, teacher, or classroom…"
          className="h-9 w-72"
        />
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {rows.length} students · {orderedMonths.length} months
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Student
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Teacher
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly (BRL)
              </th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Due day
              </th>
              {orderedMonths.map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {monthShort(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const amountBrl =
                r.monthly_tuition_cents != null
                  ? (r.monthly_tuition_cents / 100).toFixed(2)
                  : "";
              return (
                <tr key={r.roster_student_id} className="border-t">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-background px-3 py-2 font-medium">
                    {r.student_name}
                    {!r.has_auth ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        (invite pending)
                      </span>
                    ) : null}
                    {r.classroom_name ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        · {r.classroom_name}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {r.teacher_name}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <AmountInput
                      defaultValue={amountBrl}
                      onSave={(v) =>
                        saveAmount(r.roster_student_id, v, r.billing_day)
                      }
                      pending={pendingCell === `amt-${r.roster_student_id}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <DayInput
                      defaultValue={r.billing_day ? String(r.billing_day) : ""}
                      onSave={(v) =>
                        saveDay(
                          r.roster_student_id,
                          v,
                          r.monthly_tuition_cents
                        )
                      }
                      pending={pendingCell === `day-${r.roster_student_id}`}
                    />
                  </td>
                  {orderedMonths.map((m) => {
                    const payment = r.payments[m];
                    const key = `cell-${r.roster_student_id}|${m}`;
                    return (
                      <td key={m} className="px-1.5 py-2 text-center">
                        <PaymentCell
                          payment={payment}
                          month={m}
                          fallbackAmountCents={r.monthly_tuition_cents}
                          studentName={r.student_name}
                          pending={pendingCell === key}
                          onClick={() => cycle(r.roster_student_id, m)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + orderedMonths.length}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No students match your filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-dashed border-border bg-muted/20" />
          Empty — click to mark Due
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded bg-amber-500 text-white">
            <Clock className="h-2 w-2" />
          </span>
          Due — click to mark Paid
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded bg-emerald-500 text-white">
            <Check className="h-2 w-2" />
          </span>
          Paid — click to reset
        </span>
        <span className="ml-auto">Hover a cell to see amounts + timestamps.</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell components
// ---------------------------------------------------------------------------

function PaymentCell({
  payment,
  month,
  fallbackAmountCents,
  studentName,
  pending,
  onClick,
}: {
  payment: StudentPaymentRow | null;
  month: string;
  fallbackAmountCents: number | null;
  studentName: string;
  pending: boolean;
  onClick: () => void;
}) {
  const state: PaymentCellState = cellStateOf(payment);
  const amount = payment?.amount_cents ?? fallbackAmountCents ?? null;
  const [isPending, startTransition] = useTransition();

  const base =
    "mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  const palette =
    state === "paid"
      ? "bg-emerald-500 text-white border border-emerald-600 shadow-sm hover:brightness-110"
      : state === "due"
        ? "bg-amber-500 text-white border border-amber-600 shadow-sm hover:brightness-110"
        : "border border-dashed border-border bg-muted/10 text-muted-foreground/50 hover:border-primary/50 hover:bg-primary/5";

  return (
    <div className="group relative inline-block">
      <button
        type="button"
        onClick={() => startTransition(onClick)}
        disabled={pending || isPending}
        className={`${base} ${palette} ${pending || isPending ? "opacity-60" : ""}`}
        aria-label={`${studentName} · ${monthLong(month)} · ${state}`}
      >
        {pending || isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : state === "paid" ? (
          <Check className="h-3.5 w-3.5" />
        ) : state === "due" ? (
          <Clock className="h-3 w-3" />
        ) : null}
      </button>
      <PaymentTooltip
        state={state}
        month={month}
        amountCents={amount}
        dueMarkedAt={payment?.due_marked_at ?? null}
        paidAt={payment?.paid_at ?? null}
        studentName={studentName}
      />
    </div>
  );
}

function PaymentTooltip({
  state,
  month,
  amountCents,
  dueMarkedAt,
  paidAt,
  studentName,
}: {
  state: PaymentCellState;
  month: string;
  amountCents: number | null;
  dueMarkedAt: string | null;
  paidAt: string | null;
  studentName: string;
}) {
  const tone =
    state === "paid"
      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
      : state === "due"
        ? "border-amber-500/60 bg-amber-500/20 text-amber-900 dark:text-amber-100"
        : "border-border bg-card text-foreground";
  const label =
    state === "paid"
      ? "Paid"
      : state === "due"
        ? "Due payment"
        : "Not tracked yet";
  return (
    <div
      role="tooltip"
      className={`pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-lg border p-3 text-left text-[11px] leading-snug shadow-xl backdrop-blur-sm opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 ${tone}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {studentName}
      </p>
      <p className="text-sm font-semibold capitalize">{monthLong(month)}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          {label}
        </span>
        <span className="font-semibold tabular-nums">
          {amountCents != null ? BRL(amountCents) : "—"}
        </span>
      </div>
      {state !== "none" ? (
        <div className="mt-2 space-y-0.5 border-t border-current/20 pt-2">
          <p className="flex items-center justify-between">
            <span className="opacity-70">Marked due:</span>
            <span className="tabular-nums">{fmtDateTime(dueMarkedAt)}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="opacity-70">Paid:</span>
            <span className="tabular-nums">{fmtDateTime(paidAt)}</span>
          </p>
        </div>
      ) : (
        <p className="mt-2 opacity-70">
          Click to mark this month as a debt.
        </p>
      )}
    </div>
  );
}

function AmountInput({
  defaultValue,
  onSave,
  pending,
}: {
  defaultValue: string;
  onSave: (value: string) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== defaultValue) onSave(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="0.00"
        className="h-7 w-20 text-right text-xs"
        disabled={pending}
      />
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
    </div>
  );
}

function DayInput({
  defaultValue,
  onSave,
  pending,
}: {
  defaultValue: string;
  onSave: (value: string) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex items-center justify-center gap-1">
      <Input
        type="number"
        min={1}
        max={28}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== defaultValue && value !== "") onSave(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="10"
        className="h-7 w-14 text-center text-xs"
        disabled={pending}
      />
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
    </div>
  );
}
