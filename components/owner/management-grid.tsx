"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  cyclePaymentState,
  setStudentTuition,
} from "@/lib/actions/payments";
import {
  cellStateOf,
  type ManagementRow,
  type PaymentCellState,
  type StudentPaymentRow,
} from "@/lib/payments-types";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  months: string[]; // newest first (YYYY-MM-01)
  rows: ManagementRow[];
}

function monthShort(iso: string, pt: boolean): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return d.toLocaleDateString(pt ? "pt-BR" : "en-US", {
    timeZone: "UTC",
    month: "short",
    year: "2-digit",
  });
}
function monthLong(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return d.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
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
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
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

  // Year picker. Starts with the years actually present in the seed
  // data (2025, 2026, …) and can be extended with a "+ Add year"
  // button. Empty added-years can be removed again.
  const baseYears = useMemo(() => {
    const set = new Set<number>();
    for (const m of months) set.add(Number(m.slice(0, 4)));
    return [...set].sort((a, b) => a - b); // ascending
  }, [months]);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const availableYears = useMemo(() => {
    const set = new Set<number>([...baseYears, ...extraYears]);
    return [...set].sort((a, b) => a - b);
  }, [baseYears, extraYears]);
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentYear = new Date().getFullYear();
    if (baseYears.includes(currentYear)) return currentYear;
    return baseYears[baseYears.length - 1] ?? currentYear;
  });

  // Always render all 12 months for the selected year. Cells outside a
  // student's start → end window will be locked per-row.
  const orderedMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, "0");
      return `${selectedYear}-${mm}-01`;
    });
  }, [selectedYear]);

  // Does ANY student have a real payment row in the given year? Used
  // to decide whether "Remove year" is allowed for user-added years.
  function yearHasAnyPayment(year: number): boolean {
    for (const r of rows) {
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, "0")}-01`;
        if (r.payments[key]) return true;
      }
    }
    return false;
  }

  function addYear() {
    const last = availableYears[availableYears.length - 1] ?? new Date().getFullYear();
    const next = last + 1;
    setExtraYears((prev) => [...prev, next]);
    setSelectedYear(next);
  }

  function removeYear(year: number) {
    // Only user-added years that are empty can be removed.
    if (baseYears.includes(year)) return;
    if (yearHasAnyPayment(year)) return;
    setExtraYears((prev) => prev.filter((y) => y !== year));
    if (selectedYear === year) {
      const fallback =
        availableYears.filter((y) => y !== year).pop() ??
        new Date().getFullYear();
      setSelectedYear(fallback);
    }
  }

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
      toast.error(pt ? "Valor inválido" : "Invalid amount");
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
      toast.error(
        pt
          ? "O dia de vencimento deve estar entre 1 e 28"
          : "Due day must be between 1 and 28",
      );
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            pt
              ? "Filtrar por aluno, professor ou turma…"
              : "Filter by student, teacher, or classroom…"
          }
          className="h-9 w-72"
        />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pt ? "Ano" : "Year"}
          </span>
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs">
            {availableYears.map((y) => {
              const isExtra = !baseYears.includes(y);
              const canRemove = isExtra && !yearHasAnyPayment(y);
              return (
                <span key={y} className="relative inline-flex">
                  <button
                    type="button"
                    onClick={() => setSelectedYear(y)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      selectedYear === y
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={selectedYear === y}
                  >
                    {y}
                  </button>
                  {canRemove ? (
                    <button
                      type="button"
                      onClick={() => removeYear(y)}
                      title={
                        pt
                          ? `Remover ${y} (vazio)`
                          : `Remove ${y} (empty)`
                      }
                      aria-label={pt ? `Remover ${y}` : `Remove ${y}`}
                      className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-rose-600"
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              );
            })}
            <button
              type="button"
              onClick={addYear}
              title={pt ? "Adicionar ano" : "Add year"}
              aria-label={pt ? "Adicionar ano" : "Add year"}
              className="ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
            >
              +
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {pt
            ? `${filtered.length} de ${rows.length} ${rows.length === 1 ? "aluno" : "alunos"} · ${orderedMonths.length} meses em ${selectedYear}`
            : `${filtered.length} of ${rows.length} students · ${orderedMonths.length} months in ${selectedYear}`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {pt ? "Aluno" : "Student"}
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {pt ? "Professor" : "Teacher"}
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {pt ? "Mensal (BRL)" : "Monthly (BRL)"}
              </th>
              <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {pt ? "Dia de venc." : "Due day"}
              </th>
              {orderedMonths.map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {monthShort(m, pt)}
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
                    {/* Click the name to jump into the per-student page,
                        where the curriculum PDF + receipts live. */}
                    <Link
                      href={`/teacher/students/${r.roster_student_id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {r.student_name}
                    </Link>
                    {!r.has_auth ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {pt ? "(convite pendente)" : "(invite pending)"}
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
                    // Student's active window. Start = billing_starts_on
                    // when set, otherwise the first day of the month the
                    // roster row was created. End = ended_on, or open
                    // when still active. Converting to first-of-month on
                    // both sides so the compare is purely on MONTH, not
                    // day — prevents off-by-one on the student's join
                    // day.
                    const startSource =
                      r.billing_starts_on ?? r.roster_created_at ?? "0000-00-01";
                    const start = `${startSource.slice(0, 7)}-01`;
                    const end = r.ended_on
                      ? `${r.ended_on.slice(0, 7)}-01`
                      : null;
                    const monthIso = m.slice(0, 10);
                    const locked =
                      monthIso < start || (end !== null && monthIso > end);
                    return (
                      <td key={m} className="px-1.5 py-2 text-center">
                        <PaymentCell
                          payment={payment}
                          month={m}
                          fallbackAmountCents={r.monthly_tuition_cents}
                          studentName={r.student_name}
                          pending={pendingCell === key}
                          locked={locked}
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
                  {pt
                    ? "Nenhum aluno corresponde ao filtro."
                    : "No students match your filter."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-dashed border-border bg-muted/20" />
          {pt
            ? "Vazio — clique para marcar como A vencer"
            : "Empty — click to mark Due"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded bg-amber-500 text-white">
            <Clock className="h-2 w-2" />
          </span>
          {pt
            ? "A vencer — clique para marcar como Pago"
            : "Due — click to mark Paid"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded bg-emerald-500 text-white">
            <Check className="h-2 w-2" />
          </span>
          {pt ? "Pago — clique para limpar" : "Paid — click to reset"}
        </span>
        <span className="ml-auto">
          {pt
            ? "Passe o mouse em uma célula para ver valores e datas."
            : "Hover a cell to see amounts + timestamps."}
        </span>
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
  locked,
  onClick,
}: {
  payment: StudentPaymentRow | null;
  month: string;
  fallbackAmountCents: number | null;
  studentName: string;
  pending: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const state: PaymentCellState = cellStateOf(payment);
  const amount = payment?.amount_cents ?? fallbackAmountCents ?? null;
  const [isPending, startTransition] = useTransition();

  const base =
    "mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  const palette = locked
    ? "border border-transparent bg-transparent text-muted-foreground/30 cursor-not-allowed"
    : state === "paid"
      ? "bg-emerald-500 text-white border border-emerald-600 shadow-sm hover:brightness-110"
      : state === "due"
        ? "bg-amber-500 text-white border border-amber-600 shadow-sm hover:brightness-110"
        : "border border-dashed border-border bg-muted/10 text-muted-foreground/50 hover:border-primary/50 hover:bg-primary/5";

  return (
    <div className="group relative inline-block">
      <button
        type="button"
        onClick={() => {
          if (locked) return;
          startTransition(onClick);
        }}
        disabled={pending || isPending || locked}
        className={`${base} ${palette} ${pending || isPending ? "opacity-60" : ""}`}
        aria-label={`${studentName} · ${monthLong(month)} · ${locked ? "outside active window" : state}`}
      >
        {locked ? (
          <span className="text-[10px] opacity-50">—</span>
        ) : pending || isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : state === "paid" ? (
          <Check className="h-3.5 w-3.5" />
        ) : state === "due" ? (
          <Clock className="h-3 w-3" />
        ) : null}
      </button>
      {/* Receipt download — visible on hover whenever the month is
          paid. stopPropagation so clicking the doc icon doesn't also
          cycle the payment state. */}
      {state === "paid" && payment?.id ? (
        <a
          href={`/print/receipt/${payment.id}?autoprint=1`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Baixar recibo"
          aria-label={`Baixar recibo · ${studentName} · ${monthLong(month)}`}
          className="absolute -right-1.5 -top-1.5 z-20 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white opacity-0 shadow-sm transition-opacity hover:bg-slate-700 group-hover:flex group-hover:opacity-100"
        >
          <FileText className="h-2.5 w-2.5" />
        </a>
      ) : null}
      {locked ? null : (
        <PaymentTooltip
          state={state}
          month={month}
          amountCents={amount}
          dueMarkedAt={payment?.due_marked_at ?? null}
          paidAt={payment?.paid_at ?? null}
          studentName={studentName}
        />
      )}
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
          const normalized = value.trim() === ""
            ? ""
            : (() => {
                const n = parseFloat(value.replace(",", "."));
                return Number.isFinite(n) ? n.toFixed(2) : value;
              })();
          if (normalized !== value) setValue(normalized);
          if (normalized !== defaultValue) onSave(normalized);
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
