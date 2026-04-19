"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, GraduationCap, Music2, Plus, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/context";
import type { LessonDraftMeta } from "@/lib/actions/lesson-drafts";
import type { MusicMeta } from "@/lib/content/music";
import { toMusicSlug } from "@/lib/content/music";
import { bulkAssignManyLessons } from "@/lib/actions/assignments";
import { createClassroomQuick } from "@/lib/actions/classroom";

type TargetType = "classroom" | "student";

interface Classroom {
  id: string;
  name: string;
}
interface Student {
  id: string;
  fullName: string;
  classroomId: string | null;
}

interface Props {
  lessons: LessonDraftMeta[];
  musics?: MusicMeta[];
  classrooms: Classroom[];
  students: Student[];
  label?: string;
  variant?: "primary" | "subtle";
}

interface PickerItem {
  slug: string; // canonical assignment slug (lesson slug or `music:<slug>`)
  title: string;
  kind: "lesson" | "music";
  cefr: string;
  category: string;
  // Music-only haystack bits — artist + year let the songs picker search
  // by those fields without forcing them into every lesson row.
  artist?: string;
  year?: number;
}

export function AssignLessonButton({
  lessons,
  musics = [],
  classrooms,
  students,
  label,
  variant = "primary",
}: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]); // ordered slugs
  const [search, setSearch] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("classroom");
  const [classroomId, setClassroomId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [classroomOptions, setClassroomOptions] = useState(classrooms);
  const [pending, startTransition] = useTransition();

  // Single-student mode: dialog was opened from a student's profile page.
  // Skip the "whom to assign to" section entirely — the target is fixed.
  const singleStudent = students.length === 1 ? students[0] : null;
  const singleStudentHasClassroom = !!singleStudent?.classroomId;

  const t = locale === "pt-BR"
    ? {
        trigger: label ?? "Atribuir lições",
        title: "Atribuir lições",
        description:
          "Escolha uma ou mais lições/músicas. Elas serão atribuídas na ordem em que você clicar.",
        descriptionSingle: (name: string) =>
          `Escolha uma ou mais lições/músicas para ${name}. A ordem dos cliques vira a ordem de entrega.`,
        searchPlaceholder: "Buscar por título, nível ou tipo…",
        songSearchPlaceholder: "Buscar música: título, artista ou ano…",
        lessonsHeading: "Lições",
        songsHeading: "Músicas",
        selectedHeading: (n: number) =>
          n === 1 ? "1 item selecionado" : `${n} itens selecionados`,
        pickAtLeastOne: "Selecione pelo menos uma lição ou música.",
        target: "Atribuir a",
        targetClassroom: "Turma inteira",
        targetStudent: "Aluno específico",
        pickClassroom: "Selecione uma turma",
        pickStudent: "Selecione um aluno",
        noClassroomSpecified: "Sem turma definida",
        classroomLabel: "Turma",
        newClassroom: "Nova turma",
        newClassroomPrompt: "Nome da nova turma",
        classroomCreated: "Turma criada",
        cancel: "Cancelar",
        assign: (n: number) => (n === 1 ? "Atribuir" : `Atribuir ${n}`),
        assigning: "Atribuindo…",
        assignedSkipped: (a: number, s: number) =>
          s > 0
            ? `${a} atribuídas, ${s} já existiam`
            : `${a} atribuídas`,
        emptyLessons: "Nenhuma lição ou música publicada ainda.",
        emptyTargets: "Crie uma turma ou adicione um aluno primeiro.",
        noMatches: "Nenhum resultado para esse filtro.",
        assigningToSingle: (name: string) => `Atribuindo para ${name}`,
        classroomDisabledNoClass:
          "Este aluno não está em uma turma — atribuindo direto a ele.",
      }
    : {
        trigger: label ?? "Assign lessons",
        title: "Assign lessons",
        description:
          "Pick one or more lessons / songs. They will be assigned in the order you click them.",
        descriptionSingle: (name: string) =>
          `Pick one or more lessons / songs for ${name}. Click order becomes delivery order.`,
        searchPlaceholder: "Search by title, level, or type…",
        songSearchPlaceholder: "Search song: title, artist, or year…",
        lessonsHeading: "Lessons",
        songsHeading: "Songs",
        selectedHeading: (n: number) =>
          n === 1 ? "1 item selected" : `${n} items selected`,
        pickAtLeastOne: "Pick at least one lesson or song.",
        target: "Assign to",
        targetClassroom: "Whole classroom",
        targetStudent: "Specific student",
        pickClassroom: "Pick a classroom",
        pickStudent: "Pick a student",
        noClassroomSpecified: "No classroom specified",
        classroomLabel: "Classroom",
        newClassroom: "New classroom",
        newClassroomPrompt: "Name of the new classroom",
        classroomCreated: "Classroom created",
        cancel: "Cancel",
        assign: (n: number) => (n === 1 ? "Assign" : `Assign ${n}`),
        assigning: "Assigning…",
        assignedSkipped: (a: number, s: number) =>
          s > 0
            ? `${a} assigned, ${s} already there`
            : `${a} assigned`,
        emptyLessons: "No published lessons or songs yet.",
        emptyTargets: "Create a classroom or add a student first.",
        noMatches: "No results for that filter.",
        assigningToSingle: (name: string) => `Assigning to ${name}`,
        classroomDisabledNoClass:
          "This student isn't in a classroom — assigning to them directly.",
      };

  const publishedLessons = lessons.filter((l) => l.published);

  const lessonItems = useMemo<PickerItem[]>(() => {
    return publishedLessons.map((l) => ({
      slug: l.slug,
      title: l.title,
      kind: "lesson" as const,
      cefr: l.cefr_level,
      category: l.category,
    }));
  }, [publishedLessons]);

  const songItems = useMemo<PickerItem[]>(() => {
    return musics.map((m) => ({
      slug: toMusicSlug(m.slug),
      title: m.title,
      kind: "music" as const,
      cefr: m.cefr_level,
      category: "music",
      artist: m.artist,
      year: m.year,
    }));
  }, [musics]);

  const items = useMemo(() => [...lessonItems, ...songItems], [
    lessonItems,
    songItems,
  ]);

  const [songSearch, setSongSearch] = useState("");

  const filteredLessonItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lessonItems;
    return lessonItems.filter((i) => {
      const hay = `${i.title} ${i.cefr} ${i.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [lessonItems, search]);

  const filteredSongItems = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    if (!q) return songItems;
    return songItems.filter((i) => {
      const hay = `${i.title} ${i.artist ?? ""} ${i.year ?? ""} ${i.cefr}`
        .toLowerCase();
      return hay.includes(q);
    });
  }, [songItems, songSearch]);

  const selectedItems = useMemo(() => {
    const byId = new Map(items.map((i) => [i.slug, i] as const));
    return selected
      .map((slug) => byId.get(slug))
      .filter((x): x is PickerItem => !!x);
  }, [items, selected]);

  function reset() {
    setSelected([]);
    setSearch("");
    setSongSearch("");
    setTargetType(singleStudent && !singleStudentHasClassroom ? "student" : "classroom");
    // In single-student mode, pre-fill the classroom dropdown with the
    // student's existing classroom (empty = "No classroom specified").
    setClassroomId(singleStudent?.classroomId ?? "");
    setStudentId(singleStudent?.id ?? "");
  }

  function onTargetChange(next: TargetType) {
    if (next === "classroom" && singleStudent && !singleStudentHasClassroom) {
      return; // guarded — button is disabled too, but belt-and-suspenders
    }
    setTargetType(next);
    setClassroomId("");
    if (!singleStudent) setStudentId("");
  }

  function toggleItem(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function removeSelected(slug: string) {
    setSelected((prev) => prev.filter((s) => s !== slug));
  }

  function createClassroomInline() {
    const name = window.prompt(t.newClassroomPrompt);
    const trimmed = name?.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createClassroomQuick({ name: trimmed });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setClassroomOptions((prev) => [...prev, { id: res.id, name: res.name }]);
      setClassroomId(res.id);
      toast.success(t.classroomCreated);
    });
  }

  function submit() {
    if (selected.length === 0) {
      toast.error(t.pickAtLeastOne);
      return;
    }

    let finalClassroomId: string | null = null;
    let finalRosterStudentId: string | null = null;

    if (singleStudent) {
      finalRosterStudentId = singleStudent.id;
      // Classroom in single-student mode is picked in the dialog — empty
      // means "no classroom specified" (allowed by migration 024).
      finalClassroomId = classroomId || null;
    } else if (targetType === "classroom") {
      if (!classroomId) {
        toast.error(t.pickClassroom);
        return;
      }
      finalClassroomId = classroomId;
    } else {
      if (!studentId) {
        toast.error(t.pickStudent);
        return;
      }
      const student = students.find((s) => s.id === studentId);
      finalRosterStudentId = studentId;
      finalClassroomId = student?.classroomId ?? null;
    }

    startTransition(async () => {
      const result = await bulkAssignManyLessons({
        classroomId: finalClassroomId,
        lessonSlugs: selected,
        rosterStudentId: finalRosterStudentId,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(t.assignedSkipped(result.assigned, result.skipped));
        setOpen(false);
        reset();
      }
    });
  }

  const hasAnyItem = items.length > 0;

  return (
    <>
      <Button
        size="sm"
        variant={variant === "primary" ? "default" : "outline"}
        className="gap-1.5"
        onClick={() => {
          // Default target on open — if the dialog is pinned to a single
          // student with no classroom, jump straight to "Specific student".
          if (singleStudent) {
            setStudentId(singleStudent.id);
            setTargetType("student");
            setClassroomId(singleStudent.classroomId ?? "");
          } else {
            setTargetType("classroom");
          }
          setOpen(true);
        }}
      >
        <BookOpen className="h-4 w-4" />
        {t.trigger}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto sm:w-[92vw]">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>
              {singleStudent
                ? t.descriptionSingle(singleStudent.fullName)
                : t.description}
            </DialogDescription>
          </DialogHeader>

          {!hasAnyItem ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {t.emptyLessons}
            </p>
          ) : !singleStudent && classrooms.length === 0 && students.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {t.emptyTargets}
            </p>
          ) : (
            <div className="space-y-4">
              {singleStudent ? (
                <>
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                    <UserRound className="mr-1.5 inline-block h-3.5 w-3.5" />
                    {t.assigningToSingle(singleStudent.fullName)}
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.classroomLabel}
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={classroomId}
                        onChange={(e) => setClassroomId(e.target.value)}
                        className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                      >
                        <option value="">{t.noClassroomSpecified}</option>
                        {classroomOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={createClassroomInline}
                        disabled={pending}
                        aria-label={t.newClassroom}
                        title={t.newClassroom}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-card px-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.target}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onTargetChange("classroom")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                        targetType === "classroom"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      {t.targetClassroom}
                    </button>
                    <button
                      type="button"
                      onClick={() => onTargetChange("student")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                        targetType === "student"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      {t.targetStudent}
                    </button>
                  </div>
                </div>
              )}

              {!singleStudent && targetType === "classroom" ? (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <select
                      value={classroomId}
                      onChange={(e) => setClassroomId(e.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    >
                      <option value="">{t.pickClassroom}</option>
                      {classroomOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={createClassroomInline}
                      disabled={pending}
                      aria-label={t.newClassroom}
                      title={t.newClassroom}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-card px-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {!singleStudent && targetType === "student" ? (
                <div className="space-y-1.5">
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">{t.pickStudent}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                        {s.classroomId
                          ? ""
                          : locale === "pt-BR"
                            ? " (sem turma)"
                            : " (no classroom)"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Selected items — ordered, removable. */}
              {selectedItems.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.selectedHeading(selectedItems.length)}
                  </p>
                  <ol className="space-y-1">
                    {selectedItems.map((it, i) => (
                      <li
                        key={it.slug}
                        className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-xs"
                      >
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold tabular-nums text-primary">
                          {i + 1}
                        </span>
                        {it.kind === "music" ? (
                          <Music2 className="h-3 w-3 shrink-0 text-primary" />
                        ) : (
                          <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {it.cefr.toUpperCase()} · {it.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelected(it.slug)}
                          aria-label="Remove"
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {/* Pickers — stacked on mobile, side-by-side on md+. */}
              <div className="grid gap-4 md:grid-cols-2">
              {lessonItems.length > 0 ? (
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.lessonsHeading}
                  </p>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                  <div className="h-64 overflow-y-auto rounded-md border border-border">
                    {filteredLessonItems.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                        {t.noMatches}
                      </p>
                    ) : (
                      <ul>
                        {filteredLessonItems.map((it) => {
                          const picked = selected.includes(it.slug);
                          return (
                            <li key={it.slug}>
                              <button
                                type="button"
                                onClick={() => toggleItem(it.slug)}
                                className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-1.5 text-left text-xs last:border-b-0 transition-colors ${
                                  picked ? "bg-primary/10" : "hover:bg-muted/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={picked}
                                  className="h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
                                />
                                <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">
                                  <span className="text-muted-foreground">
                                    {it.cefr.toUpperCase()} · {it.category}
                                  </span>{" "}
                                  · {it.title}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Songs picker — separate list, searches by title / artist / year. */}
              {songItems.length > 0 ? (
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.songsHeading}
                  </p>
                  <input
                    type="search"
                    value={songSearch}
                    onChange={(e) => setSongSearch(e.target.value)}
                    placeholder={t.songSearchPlaceholder}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                  <div className="h-64 overflow-y-auto rounded-md border border-border">
                    {filteredSongItems.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                        {t.noMatches}
                      </p>
                    ) : (
                      <ul>
                        {filteredSongItems.map((it) => {
                          const picked = selected.includes(it.slug);
                          return (
                            <li key={it.slug}>
                              <button
                                type="button"
                                onClick={() => toggleItem(it.slug)}
                                className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-1.5 text-left text-xs last:border-b-0 transition-colors ${
                                  picked ? "bg-primary/10" : "hover:bg-muted/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={picked}
                                  className="h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
                                />
                                <Music2 className="h-3 w-3 shrink-0 text-primary" />
                                <span className="min-w-0 flex-1 truncate">
                                  <span className="text-muted-foreground">
                                    {it.cefr.toUpperCase()} · {it.artist}
                                    {it.year ? ` · ${it.year}` : ""}
                                  </span>{" "}
                                  · {it.title}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={submit}
              disabled={pending || !hasAnyItem || selected.length === 0}
            >
              {pending ? t.assigning : t.assign(selected.length)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
