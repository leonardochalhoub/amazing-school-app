"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Download,
  Flame,
  History,
  MessageSquarePlus,
  Music,
  Pencil,
  RotateCw,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/context";
import {
  migrateBankEntry,
  recordBankAssignment,
  sysadminListAllPersonalizedLessons,
  sysadminSoftDeleteBankEntry,
  sysadminSpreadLessons,
  sysadminSpreadMusicOverrides,
  unmigrateBankEntry,
} from "@/lib/actions/lesson-bank";
import {
  sendReviewMessage,
  suggestBankEntryUpdate,
} from "@/lib/actions/sysadmin-messages";
import type {
  LessonBankEntryWithAuthor,
  LessonBankVersionRow,
} from "@/lib/actions/lesson-bank-types";
import { CEFR_BANDS, cefrBandOf } from "@/lib/content/schema";

type Tab = "recent" | "popular" | "mine" | "deleted";

export interface SpreadablePersonalizedLesson {
  id: string;
  teacher_id: string;
  teacher_name: string | null;
  slug: string;
  title: string;
  cefr_level: string | null;
  category: string | null;
  published: boolean;
  created_at: string;
  already_spread: boolean;
}

export interface SpreadableMusicOverride {
  teacher_id: string;
  teacher_name: string | null;
  music_slug: string;
  updated_at: string;
  already_spread: boolean;
}

interface Props {
  entries: LessonBankEntryWithAuthor[];
  myAuthorId: string;
  isOwner: boolean;
  versionsByEntry: Record<string, LessonBankVersionRow[]>;
  deletedEntries?: LessonBankEntryWithAuthor[];
  // For sysadmin "spread" modal
  personalizedLessons?: SpreadablePersonalizedLesson[];
  musicOverrides?: SpreadableMusicOverride[];
}

export function LessonBankBrowser({
  entries,
  myAuthorId,
  isOwner,
  versionsByEntry,
  deletedEntries = [],
  personalizedLessons = [],
  musicOverrides = [],
}: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("recent");
  const [cefr, setCefr] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [spreadOpen, setSpreadOpen] = useState(false);
  const [reviewFor, setReviewFor] = useState<LessonBankEntryWithAuthor | null>(
    null,
  );
  const [suggestFor, setSuggestFor] = useState<LessonBankEntryWithAuthor | null>(
    null,
  );

  // Derive filter option pools from the data we already have.
  const authors = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const name = e.author_name || e.author_email || e.author_id.slice(0, 8);
      map.set(e.author_id, name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.category) set.add(e.category);
    return Array.from(set).sort();
  }, [entries]);

  const visible = useMemo(() => {
    let pool: LessonBankEntryWithAuthor[] =
      tab === "deleted" ? deletedEntries : entries;
    if (tab === "mine") pool = pool.filter((e) => e.author_id === myAuthorId);
    if (cefr) pool = pool.filter((e) => cefrBandOf(e.cefr_level ?? "") === cefr);
    if (category) pool = pool.filter((e) => e.category === category);
    if (author) pool = pool.filter((e) => e.author_id === author);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      pool = pool.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.slug ?? "").toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.author_name ?? "").toLowerCase().includes(q),
      );
    }
    if (tab === "popular") {
      pool = [...pool].sort((a, b) => b.import_count - a.import_count);
    } else if (tab !== "deleted") {
      pool = [...pool].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }
    return pool;
  }, [tab, entries, deletedEntries, myAuthorId, cefr, category, author, query]);

  function doMigrate(entry: LessonBankEntryWithAuthor) {
    startTransition(async () => {
      const r = await migrateBankEntry(entry.id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt ? "Lição trazida para o seu ambiente." : "Lesson brought into your environment.",
      );
      router.refresh();
    });
  }

  function doUnmigrate(entry: LessonBankEntryWithAuthor) {
    if (
      !confirm(
        pt
          ? "Remover esta lição migrada do seu ambiente? (você pode migrar novamente depois)"
          : "Remove this migrated lesson from your environment? (you can migrate again later)",
      )
    )
      return;
    startTransition(async () => {
      const r = await unmigrateBankEntry(entry.id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Removida." : "Removed.");
      router.refresh();
    });
  }

  function doSoftDelete(entry: LessonBankEntryWithAuthor) {
    const reason = prompt(
      pt
        ? "Motivo da exclusão (ficará no log do sysadmin):"
        : "Deletion reason (kept in the sysadmin log):",
      "",
    );
    if (reason === null) return;
    startTransition(async () => {
      const r = await sysadminSoftDeleteBankEntry({
        entry_id: entry.id,
        reason,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt
          ? "Excluída (ainda acessível no log do sysadmin)."
          : "Deleted (still visible in the sysadmin log).",
      );
      router.refresh();
    });
  }

  function doAssign(entry: LessonBankEntryWithAuthor) {
    // Music entries assign through the music catalog — deep-link to the
    // song page where the teacher's own override (migrated from the
    // bank) will be served. Lesson entries hit the generic assignment
    // flow after the teacher has migrated them.
    startTransition(async () => {
      await recordBankAssignment(entry.id);
    });
    if (entry.kind === "music") {
      router.push(`/teacher/music/${entry.music_slug ?? ""}`);
      return;
    }
    if (entry.migration?.local_lesson_id) {
      router.push(`/teacher/lessons?q=${encodeURIComponent(entry.slug)}`);
    } else {
      toast.info(
        pt
          ? "Traga a lição para seu ambiente primeiro (Migrar) antes de atribuí-la."
          : "Migrate the lesson into your environment first before assigning.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-background p-1 w-max">
        <TabButton
          active={tab === "recent"}
          onClick={() => setTab("recent")}
          icon={<Clock className="h-3 w-3" />}
        >
          {pt ? `Recentes (${entries.length})` : `Recent (${entries.length})`}
        </TabButton>
        <TabButton
          active={tab === "popular"}
          onClick={() => setTab("popular")}
          icon={<Flame className="h-3 w-3" />}
        >
          {pt ? "Mais importados" : "Most imported"}
        </TabButton>
        <TabButton
          active={tab === "mine"}
          onClick={() => setTab("mine")}
          icon={<Share2 className="h-3 w-3" />}
        >
          {pt ? "Minhas publicações" : "My shares"}
        </TabButton>
        {isOwner ? (
          <TabButton
            active={tab === "deleted"}
            onClick={() => setTab("deleted")}
            icon={<Trash2 className="h-3 w-3" />}
          >
            {pt ? `Excluídas (${deletedEntries.length})` : `Deleted (${deletedEntries.length})`}
          </TabButton>
        ) : null}
      </nav>

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
          value={category}
          onChange={setCategory}
          options={[
            { value: "", label: pt ? "Todas" : "All" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          label={pt ? "Autor" : "Author"}
          value={author}
          onChange={setAuthor}
          options={[
            { value: "", label: pt ? "Todos" : "All" },
            ...authors.map(([id, name]) => ({ value: id, label: name })),
          ]}
        />
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pt ? "Busca" : "Search"}
          </label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pt ? "Título, slug, descrição, autor…" : "Title, slug, description, author…"}
            className="h-9"
          />
        </div>
        {isOwner ? (
          <Button
            size="sm"
            onClick={() => setSpreadOpen(true)}
            className="ml-auto gap-1.5"
          >
            <Wand2 className="h-4 w-4" />
            {pt ? "Espalhar lições" : "Spread lessons"}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {pt ? "Nada por aqui ainda." : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((entry) => {
            const versions = versionsByEntry[entry.id] ?? [];
            const isMine = entry.author_id === myAuthorId;
            const isMigrated = !!entry.migration;
            const isMusic = entry.kind === "music";
            const needsSync =
              isMigrated &&
              entry.migration!.synced_version < entry.current_version;
            // For music entries the editor lives at /teacher/music/[slug]/edit
            // and the "assignable" link lands on the song preview page.
            const editHref = isMusic
              ? `/teacher/music/${entry.music_slug ?? ""}/edit`
              : `/teacher/lessons/edit/${entry.slug}`;
            const displaySlug = isMusic ? entry.music_slug ?? entry.slug : entry.slug;
            return (
              <li key={entry.id}>
                <Card className="h-full">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                          {isMusic ? (
                            <Music className="h-3.5 w-3.5 shrink-0 text-fuchsia-500" />
                          ) : null}
                          {entry.title}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          /{displaySlug}
                        </p>
                        <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
                          {isMusic ? (
                            <Badge
                              variant="default"
                              className="bg-fuchsia-500/90 text-[10px]"
                            >
                              {pt ? "Música" : "Song"}
                            </Badge>
                          ) : null}
                          {entry.cefr_level ? (
                            <Badge variant="outline" className="text-[10px]">
                              {entry.cefr_level.toUpperCase()}
                            </Badge>
                          ) : null}
                          {!isMusic && entry.category ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {entry.category}
                            </Badge>
                          ) : null}
                          <Badge variant="outline" className="text-[10px]">
                            v{entry.current_version}
                          </Badge>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isMine ? (
                          <Badge
                            variant="default"
                            className="bg-violet-600 text-[10px] text-white"
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            {pt ? "Criada por você" : "Created by you"}
                          </Badge>
                        ) : null}
                        {!isMine && isMigrated ? (
                          needsSync ? (
                            <Badge variant="default" className="text-[10px]">
                              <RotateCw className="mr-1 h-3 w-3" />
                              {pt ? "Atualizada na fonte" : "Update available"}
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px]">
                              <Download className="mr-1 h-3 w-3" />
                              {pt ? "Migrada" : "Migrated"}
                            </Badge>
                          )
                        ) : null}
                        {entry.deleted_at ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {pt ? "Excluída" : "Deleted"}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {entry.author_name || entry.author_email || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(entry.updated_at).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {entry.import_count}
                      </span>
                    </div>

                    {entry.description ? (
                      <p className="line-clamp-2 rounded-md bg-muted/40 p-2 text-xs">
                        {entry.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      {!entry.deleted_at ? (
                        <>
                          {isMine ? (
                            <Link
                              href={editHref}
                              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[11px] font-medium hover:border-foreground/40"
                            >
                              <Pencil className="h-3 w-3" />
                              {isMusic
                                ? pt
                                  ? "Editar música"
                                  : "Edit song"
                                : pt
                                  ? "Editar lição"
                                  : "Edit lesson"}
                            </Link>
                          ) : !isMigrated ? (
                            <Button
                              size="sm"
                              onClick={() => doMigrate(entry)}
                              disabled={pending}
                              className="h-7 gap-1.5 text-[11px]"
                            >
                              <Download className="h-3 w-3" />
                              {pt ? "Trazer para meu ambiente" : "Bring into my env"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => doUnmigrate(entry)}
                              disabled={pending}
                              className="h-7 gap-1.5 text-[11px]"
                            >
                              <Undo2 className="h-3 w-3" />
                              {pt ? "Remover migração" : "Unmigrate"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => doAssign(entry)}
                            disabled={pending}
                            className="h-7 gap-1.5 text-[11px]"
                          >
                            <Send className="h-3 w-3" />
                            {pt ? "Atribuir" : "Assign"}
                          </Button>
                          {versions.length > 0 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpanded((s) => ({
                                  ...s,
                                  [entry.id]: !s[entry.id],
                                }))
                              }
                              className="h-7 gap-1.5 text-[11px]"
                            >
                              <History className="h-3 w-3" />
                              {pt
                                ? `Histórico (${versions.length})`
                                : `History (${versions.length})`}
                              <ChevronDown
                                className={`h-3 w-3 transition-transform ${
                                  expanded[entry.id] ? "rotate-180" : ""
                                }`}
                              />
                            </Button>
                          ) : null}
                          {isOwner && !isMine ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReviewFor(entry)}
                              className="h-7 gap-1.5 text-[11px]"
                            >
                              <MessageSquarePlus className="h-3 w-3" />
                              {pt ? "Sugerir revisão" : "Suggest review"}
                            </Button>
                          ) : null}
                          {!isOwner && !isMine ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSuggestFor(entry)}
                              className="h-7 gap-1.5 text-[11px]"
                            >
                              <MessageSquarePlus className="h-3 w-3" />
                              {pt ? "Sugerir atualização" : "Suggest update"}
                            </Button>
                          ) : null}
                          {isOwner ? (
                            <button
                              type="button"
                              onClick={() => doSoftDelete(entry)}
                              disabled={pending}
                              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Soft delete"
                              title={pt ? "Excluir (soft)" : "Soft delete"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-[11px] italic text-muted-foreground">
                          {pt
                            ? `Excluída em ${new Date(entry.deleted_at).toLocaleString()} · motivo: ${entry.deleted_reason ?? "—"}`
                            : `Deleted on ${new Date(entry.deleted_at).toLocaleString()} · reason: ${entry.deleted_reason ?? "—"}`}
                        </p>
                      )}
                    </div>

                    {expanded[entry.id] && versions.length > 0 ? (
                      <div className="mt-2 rounded-md border border-border bg-background p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {pt ? "Versões" : "Versions"}
                        </p>
                        <ul className="mt-1 space-y-1 text-[11px]">
                          {versions.map((v) => (
                            <li key={v.id} className="flex gap-2">
                              <span className="font-mono text-muted-foreground">
                                v{v.version_no}
                              </span>
                              <span className="text-muted-foreground">
                                {new Date(v.created_at).toLocaleString()}
                              </span>
                              {v.change_note ? (
                                <span className="ml-1 truncate italic">
                                  — {v.change_note}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {spreadOpen ? (
        <SpreadModal
          lessons={personalizedLessons}
          musicOverrides={musicOverrides}
          onClose={() => {
            setSpreadOpen(false);
            router.refresh();
          }}
        />
      ) : null}
      {reviewFor ? (
        <ReviewModal
          entry={reviewFor}
          onClose={() => {
            setReviewFor(null);
            router.refresh();
          }}
        />
      ) : null}
      {suggestFor ? (
        <SuggestUpdateModal
          entry={suggestFor}
          onClose={() => {
            setSuggestFor(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function SuggestUpdateModal({
  entry,
  onClose,
}: {
  entry: LessonBankEntryWithAuthor;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await suggestBankEntryUpdate({
        bank_entry_id: entry.id,
        body,
      });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt
          ? `Enviado para ${r.sent_to} sysadmin(s) para avaliação.`
          : `Sent to ${r.sent_to} sysadmin(s) for review.`,
      );
      onClose();
    });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold">
          {pt ? "Sugerir atualização" : "Suggest update"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {pt
            ? `Envia ao sysadmin uma sugestão de mudança em "${entry.title}". Se o sysadmin aprovar, o autor será notificado e aplicará a atualização (propaga para todos que migraram).`
            : `Sends a change suggestion for "${entry.title}" to sysadmin. If approved, the author gets notified and applies the update (it propagates to every teacher who migrated).`}
        </p>
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-3 w-full rounded-md border border-border bg-background p-2 text-sm"
          placeholder={
            pt
              ? "O que deve mudar e por quê?"
              : "What should change and why?"
          }
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {pt ? "Cancelar" : "Cancel"}
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending
              ? pt
                ? "Enviando…"
                : "Sending…"
              : pt
                ? "Enviar"
                : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
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

function ReviewModal({
  entry,
  onClose,
}: {
  entry: LessonBankEntryWithAuthor;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await sendReviewMessage({
        recipient_id: entry.author_id,
        bank_entry_id: entry.id,
        body,
        subject: `Review: ${entry.title}`,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt
          ? "Mensagem enviada. O professor verá um popup."
          : "Message sent. The teacher will see a popup.",
      );
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold">
          {pt ? "Sugerir revisão" : "Suggest a revision"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {pt
            ? `Enviando para: ${entry.author_name || entry.author_email || ""} sobre "${entry.title}". O professor responderá com um check verde (feito) ou um X vermelho (discordo) — e pode responder.`
            : `Sending to: ${entry.author_name || entry.author_email || ""} about "${entry.title}". The teacher can respond with a green check (done) or a red X (disagrees) — and reply.`}
        </p>
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-3 w-full rounded-md border border-border bg-background p-2 text-sm"
          placeholder={
            pt
              ? "Descreva a modificação sugerida…"
              : "Describe the suggested modification…"
          }
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {pt ? "Cancelar" : "Cancel"}
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? (pt ? "Enviando…" : "Sending…") : pt ? "Enviar" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SpreadModal({
  lessons,
  musicOverrides,
  onClose,
}: {
  lessons: SpreadablePersonalizedLesson[];
  musicOverrides: SpreadableMusicOverride[];
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [tab, setTab] = useState<"lessons" | "music">("lessons");
  const [pickedLessons, setPickedLessons] = useState<Record<string, boolean>>({});
  const [pickedMusic, setPickedMusic] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  function keyFor(m: SpreadableMusicOverride): string {
    return `${m.teacher_id}|${m.music_slug}`;
  }

  function submit() {
    startTransition(async () => {
      if (tab === "lessons") {
        const ids = Object.entries(pickedLessons)
          .filter(([, v]) => v)
          .map(([k]) => k);
        if (ids.length === 0) return;
        const r = await sysadminSpreadLessons(ids);
        if ("error" in r) {
          toast.error(r.error);
          return;
        }
        toast.success(
          pt
            ? `${r.inserted} espalhada(s), ${r.skipped} pulada(s) (duplicadas).`
            : `Spread ${r.inserted} lesson(s); skipped ${r.skipped} duplicate(s).`,
        );
        onClose();
        return;
      }
      // Music tab — decode composite key back into teacher_id + music_slug.
      const picks = Object.entries(pickedMusic)
        .filter(([, v]) => v)
        .map(([k]) => {
          const [teacher_id, music_slug] = k.split("|");
          return { teacher_id, music_slug };
        });
      if (picks.length === 0) return;
      const r = await sysadminSpreadMusicOverrides(picks);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(
        pt
          ? `${r.inserted} espalhada(s), ${r.skipped} pulada(s).`
          : `Spread ${r.inserted}; skipped ${r.skipped}.`,
      );
      onClose();
    });
  }

  const selectedCount =
    tab === "lessons"
      ? Object.values(pickedLessons).filter(Boolean).length
      : Object.values(pickedMusic).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">
            {pt ? "Espalhar para todos os bancos" : "Spread to every bank"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {pt
              ? "Publica lições personalizadas ou músicas personalizadas no banco em nome do autor. Duplicadas são ignoradas."
              : "Publish personalized lessons OR personalized songs to the bank on behalf of the author. Duplicates are skipped."}
          </p>
          <nav className="mt-3 flex items-center gap-1 rounded-full border border-border bg-background p-1 w-max">
            <button
              type="button"
              onClick={() => setTab("lessons")}
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                tab === "lessons"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {pt ? `Lições (${lessons.length})` : `Lessons (${lessons.length})`}
            </button>
            <button
              type="button"
              onClick={() => setTab("music")}
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                tab === "music"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Music className="mr-1 inline-block h-3 w-3" />
              {pt
                ? `Músicas (${musicOverrides.length})`
                : `Songs (${musicOverrides.length})`}
            </button>
          </nav>
        </div>
        <div className="max-h-[60vh] flex-1 overflow-y-auto px-5 py-3">
          {tab === "lessons" ? (
            lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {pt ? "Nenhuma lição personalizada ainda." : "No personalized lessons yet."}
              </p>
            ) : (
              <ul className="space-y-1">
                {lessons.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={!!pickedLessons[l.id]}
                      disabled={l.already_spread}
                      onChange={(e) =>
                        setPickedLessons((s) => ({ ...s, [l.id]: e.target.checked }))
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        /{l.slug} · {l.teacher_name ?? "—"} ·{" "}
                        {new Date(l.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {l.cefr_level ? (
                        <Badge variant="outline" className="text-[10px]">
                          {l.cefr_level.toUpperCase()}
                        </Badge>
                      ) : null}
                      {l.category ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {l.category}
                        </Badge>
                      ) : null}
                      {l.already_spread ? (
                        <Badge variant="default" className="text-[10px]">
                          {pt ? "Já espalhada" : "Already spread"}
                        </Badge>
                      ) : null}
                      {!l.published ? (
                        <Badge variant="outline" className="text-[10px]">
                          {pt ? "Rascunho" : "Draft"}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : musicOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pt ? "Nenhuma música personalizada ainda." : "No personalized songs yet."}
            </p>
          ) : (
            <ul className="space-y-1">
              {musicOverrides.map((m) => {
                const k = keyFor(m);
                return (
                  <li
                    key={k}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={!!pickedMusic[k]}
                      disabled={m.already_spread}
                      onChange={(e) =>
                        setPickedMusic((s) => ({ ...s, [k]: e.target.checked }))
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.music_slug}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {m.teacher_name ?? "—"} · {pt ? "atualizada em" : "updated"}{" "}
                        {new Date(m.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Badge
                        variant="default"
                        className="bg-fuchsia-500/90 text-[10px]"
                      >
                        <Music className="mr-1 h-3 w-3" />
                        {pt ? "Música" : "Song"}
                      </Badge>
                      {m.already_spread ? (
                        <Badge variant="default" className="text-[10px]">
                          {pt ? "Já espalhada" : "Already spread"}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            {selectedCount} {pt ? "selecionada(s)" : "selected"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {pt ? "Fechar" : "Close"}
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending
                ? pt
                  ? "Espalhando…"
                  : "Spreading…"
                : pt
                  ? "Espalhar selecionadas"
                  : "Spread selected"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
