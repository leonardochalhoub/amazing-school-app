"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  togglePaymentPaid,
  setStudentTuition,
  type ManagementRow,
} from "@/lib/actions/payments";

interface Props {
  months: string[]; // newest first
  rows: ManagementRow[];
}

function monthShort(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
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

  // Display oldest → newest; cap at 12 to keep the grid readable. Full 24
  // months still drive the KPIs + charts.
  const orderedMonths = useMemo(() => [...months].slice(0, 12).reverse(), [months]);

  function togglePaid(rosterId: string, month: string, next: boolean) {
    const key = `paid-${rosterId}|${month}`;
    setPendingCell(key);
    togglePaymentPaid({
      rosterStudentId: rosterId,
      billingMonth: month,
      paid: next,
    }).then((res) => {
      setPendingCell(null);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
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
          Showing {filtered.length} of {rows.length} students
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
                    const p = r.payments[m];
                    const paid = !!p?.paid;
                    const exists = !!p;
                    const key = `paid-${r.roster_student_id}|${m}`;
                    const pending = pendingCell === key;
                    const title = p
                      ? p.paid
                        ? `Paid ${BRL(p.amount_cents ?? 0)}`
                        : `Pending ${BRL(p.amount_cents ?? r.monthly_tuition_cents ?? 0)}`
                      : r.monthly_tuition_cents
                        ? "Set due day to auto-generate"
                        : "Set monthly tuition first";
                    return (
                      <td key={m} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            exists &&
                            togglePaid(r.roster_student_id, m, !paid)
                          }
                          disabled={pending || !exists}
                          title={title}
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border text-xs transition-colors ${
                            paid
                              ? "border-emerald-500/30 bg-emerald-500 text-white"
                              : exists
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                                : "border-dashed border-border bg-muted/20 text-muted-foreground/50"
                          } ${pending ? "opacity-50" : ""}`}
                        >
                          {pending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : paid ? (
                            <Check className="h-3 w-3" />
                          ) : null}
                        </button>
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

      <p className="text-xs text-muted-foreground">
        Green = paid. Amber = open debt (click to mark paid). Dashed = no
        monthly rate yet — set the BRL value and due day to start
        auto-generating invoices.
      </p>
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
