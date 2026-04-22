"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Clock, Pencil, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TeacherLessonRow } from "@/lib/actions/teacher-lessons-types";
import { CEFR_BANDS, cefrBandOf } from "@/lib/content/schema";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  lessons: TeacherLessonRow[];
}

/**
 * Compact "My lessons" grid shown on /teacher/bank?view=mine.
 *
 * Surfaces the same personalized lessons as /teacher/lessons, but from
 * the bank-owner perspective: each card links straight into the edit
 * page so the teacher can iterate on the content that's either already
 * in the bank or will be shared from here. Author-only content — it
 * never shows other teachers' lessons.
 */
export function MyLessonsBrief({ lessons }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [cefr, setCefr] = useState<string>("");
  const [skill, setSkill] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const skills = useMemo(() => {
    const set = new Set<string>();
    for (const l of lessons) {
      for (const s of l.skills ?? []) set.add(s);
      if (l.category) set.add(l.category);
    }
    return Array.from(set).sort();
  }, [lessons]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((l) => {
      if (cefr && cefrBandOf(l.cefr_level ?? "") !== cefr) return false;
      if (skill) {
        const has = (l.skills ?? []).includes(skill) || l.category === skill;
        if (!has) return false;
      }
      if (q) {
        const hay = `${l.title} ${l.slug} ${l.description ?? ""} ${l.cefr_level ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [lessons, cefr, skill, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
        <FilterSelect
          label={pt ? "CEFR" : "CEFR"}
          value={cefr}
          onChange={setCefr}
          options={[
            { value: "", label: pt ? "Todos" : "All" },
            ...CEFR_BANDS.map((b) => ({ value: b, label: b.toUpperCase() })),
          ]}
        />
        <FilterSelect
          label={pt ? "Habilidade" : "Skill"}
          value={skill}
          onChange={setSkill}
          options={[
            { value: "", label: pt ? "Todas" : "All" },
            ...skills.map((s) => ({ value: s, label: s })),
          ]}
        />
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pt ? "Busca" : "Search"}
          </label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pt ? "Título, slug, descrição…" : "Title, slug, description…"}
            className="h-9"
          />
        </div>
        <Link
          href="/teacher/lessons/new"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {pt ? "Nova lição" : "New lesson"}
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {lessons.length === 0
              ? pt
                ? "Você ainda não tem lições personalizadas."
                : "You haven't created any personalized lessons yet."
              : pt
                ? "Nenhuma lição corresponde aos filtros."
                : "No lessons match the filters."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pt ? (
              <>
                Use{" "}
                <Link href="/teacher/lessons/new" className="underline hover:text-foreground">
                  criar uma nova lição
                </Link>{" "}
                para começar.
              </>
            ) : (
              <>
                <Link href="/teacher/lessons/new" className="underline hover:text-foreground">
                  Create one
                </Link>{" "}
                to get started.
              </>
            )}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((l) => (
            <li key={l.id}>
              <Card className="h-full">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{l.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        /{l.slug}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        {l.cefr_level ? (
                          <Badge variant="outline" className="text-[10px]">
                            {l.cefr_level.toUpperCase()}
                          </Badge>
                        ) : null}
                        {(l.skills && l.skills.length > 0
                          ? l.skills
                          : l.category
                            ? [l.category]
                            : []
                        ).slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </p>
                    </div>
                    <Badge
                      variant={l.published ? "default" : "outline"}
                      className="shrink-0 text-[10px]"
                    >
                      {l.published ? (pt ? "Publicada" : "Published") : pt ? "Rascunho" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {l.estimated_minutes ?? "—"} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      ⭐ {l.xp_award ?? 0} XP
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(l.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  {l.description ? (
                    <p className="line-clamp-2 rounded-md bg-muted/40 p-2 text-xs">
                      {l.description}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/teacher/lessons/edit/${l.slug}`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[11px] font-medium hover:border-foreground/40"
                    >
                      <Pencil className="h-3 w-3" />
                      {pt ? "Editar" : "Edit"}
                    </Link>
                    <Link
                      href={`/teacher/lessons?q=${encodeURIComponent(l.slug)}`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      {pt ? "Atribuir" : "Assign"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {lessons.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {pt
            ? "Dica: abra uma lição → Compartilhar no banco para publicá-la para todos os professores."
            : "Tip: open a lesson → Share to bank to publish it for every teacher."}
        </p>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[140px] rounded-md border border-border bg-background px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
