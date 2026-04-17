"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  togglePaymentPaid,
  setPaymentAmount,
  generateMonth,
} from "@/lib/actions/payments";

interface Payment {
  id: string;
  paid: boolean;
  amount_cents: number | null;
}

interface Row {
  roster_student_id: string;
  student_name: string;
  teacher_id: string;
  teacher_name: string;
  has_auth: boolean;
  classroom_name: string | null;
  payments: Record<string, Payment | null>;
}

interface Props {
  months: string[]; // newest first, YYYY-MM-01
  rows: Row[];
}

function formatMonthShort(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function ManagementGrid({ months, rows }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [pendingGen, startGenTransition] = useTransition();

  const teachers = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.teacher_id, r.teacher_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (teacherFilter !== "all" && r.teacher_id !== teacherFilter)
        return false;
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.teacher_name.toLowerCase().includes(q) ||
        (r.classroom_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, teacherFilter]);

  // Display oldest→newest so the grid reads left-to-right like a calendar
  const orderedMonths = useMemo(() => [...months].reverse(), [months]);

  function toggleCell(rosterId: string, month: string, next: boolean) {
    const key = `${rosterId}|${month}`;
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

  function saveAmount(rosterId: string, month: string, value: string) {
    const brl = Number(value.replace(",", "."));
    if (!Number.isFinite(brl) || brl < 0) {
      toast.error("Invalid amount");
      return;
    }
    const cents = Math.round(brl * 100);
    const key = `amount-${rosterId}|${month}`;
    setPendingCell(key);
    setPaymentAmount({
      rosterStudentId: rosterId,
      billingMonth: month,
      amountCents: cents,
    }).then((res) => {
      setPendingCell(null);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  function handleGenerate() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    startGenTransition(async () => {
      const r = await generateMonth({ billingMonth: month });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("success" in r) {
        const created = r.created ?? 0;
        toast.success(
          created > 0
            ? `Generated ${created} payment rows for ${month.slice(0, 7)}`
            : "All students already have a row for this month"
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by student, teacher, or classroom…"
            className="h-9 w-72"
          />
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="all">All teachers</option>
            {teachers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={pendingGen}
          size="sm"
          className="gap-1"
        >
          {pendingGen ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Generate current month
        </Button>
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
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Classroom
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly (BRL)
              </th>
              {orderedMonths.map((m) => (
                <th
                  key={m}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {formatMonthShort(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              // Use the newest month's amount as the "default monthly rate"
              // input — cascades when the owner sets it.
              const current = r.payments[months[0]];
              const monthlyBrl =
                current?.amount_cents != null
                  ? (current.amount_cents / 100).toFixed(2)
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
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.teacher_name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.classroom_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <AmountInput
                      defaultValue={monthlyBrl}
                      onSave={(v) =>
                        saveAmount(r.roster_student_id, months[0], v)
                      }
                      pending={
                        pendingCell === `amount-${r.roster_student_id}|${months[0]}`
                      }
                    />
                  </td>
                  {orderedMonths.map((m) => {
                    const p = r.payments[m];
                    const paid = !!p?.paid;
                    const key = `${r.roster_student_id}|${m}`;
                    const pending = pendingCell === key;
                    return (
                      <td key={m} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            toggleCell(r.roster_student_id, m, !paid)
                          }
                          disabled={pending}
                          title={
                            p?.amount_cents != null
                              ? formatBrl(p.amount_cents)
                              : "No amount set"
                          }
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border text-xs transition-colors ${
                            paid
                              ? "border-emerald-500/30 bg-emerald-500 text-white"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
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
        Tip: set the monthly rate once per student, then use{" "}
        <strong>Generate current month</strong> each time a new month starts —
        the previous amount is carried forward automatically.
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
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="0.00"
        className="h-7 w-20 text-right text-xs"
        disabled={pending}
      />
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
    </div>
  );
}
