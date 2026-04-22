"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Music, Pencil, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CEFR_BANDS, cefrBandOf } from "@/lib/content/schema";
import { ShareMusicToBankButton } from "@/components/teacher/share-music-to-bank-button";
import { useI18n } from "@/lib/i18n/context";

export interface MySongRow {
  music_slug: string;
  title: string;
  cefr_level: string | null;
  is_in_bank: boolean;
  updated_at: string;
}

interface Props {
  songs: MySongRow[];
}

/**
 * "My Songs" grid on /teacher/bank?view=songs. Every row is a song
 * the teacher has personalized (timings, lyrics, exercises) — the
 * source of truth is teacher_music_overrides. Each card links
 * straight into the music editor and surfaces a one-click
 * Share-to-bank button so the teacher doesn't have to walk back
 * through the song page to publish.
 */
export function MySongsBrief({ songs }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [cefr, setCefr] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [shared, setShared] = useState<string>("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      if (cefr && cefrBandOf(s.cefr_level ?? "") !== cefr) return false;
      if (shared === "yes" && !s.is_in_bank) return false;
      if (shared === "no" && s.is_in_bank) return false;
      if (q) {
        const hay = `${s.title} ${s.music_slug} ${s.cefr_level ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [songs, cefr, shared, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
        <FilterSelect
          label="CEFR"
          value={cefr}
          onChange={setCefr}
          options={[
            { value: "", label: pt ? "Todos" : "All" },
            ...CEFR_BANDS.map((b) => ({ value: b, label: b.toUpperCase() })),
          ]}
        />
        <FilterSelect
          label={pt ? "No banco?" : "Shared?"}
          value={shared}
          onChange={setShared}
          options={[
            { value: "", label: pt ? "Todos" : "All" },
            { value: "yes", label: pt ? "Compartilhadas" : "In the bank" },
            { value: "no", label: pt ? "Não compartilhadas" : "Not shared" },
          ]}
        />
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pt ? "Busca" : "Search"}
          </label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pt ? "Título, slug, CEFR…" : "Title, slug, CEFR…"}
            className="h-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {songs.length === 0
              ? pt
                ? "Você ainda não personalizou nenhuma música."
                : "You haven't personalized any song yet."
              : pt
                ? "Nenhuma música corresponde aos filtros."
                : "No songs match the filters."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pt ? (
              <>
                Abra o{" "}
                <Link
                  href="/teacher/music"
                  className="underline hover:text-foreground"
                >
                  catálogo de músicas
                </Link>{" "}
                e clique em Personalizar.
              </>
            ) : (
              <>
                Open the{" "}
                <Link
                  href="/teacher/music"
                  className="underline hover:text-foreground"
                >
                  music catalog
                </Link>{" "}
                and click Personalize.
              </>
            )}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <li key={s.music_slug}>
              <Card className="h-full">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        <Music className="h-3.5 w-3.5 shrink-0 text-fuchsia-500" />
                        {s.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        /{s.music_slug}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        <Badge
                          variant="default"
                          className="bg-fuchsia-500/90 text-[10px]"
                        >
                          {pt ? "Música" : "Song"}
                        </Badge>
                        {s.cefr_level ? (
                          <Badge variant="outline" className="text-[10px]">
                            {s.cefr_level.toUpperCase()}
                          </Badge>
                        ) : null}
                      </p>
                    </div>
                    <Badge
                      variant={s.is_in_bank ? "default" : "outline"}
                      className="shrink-0 text-[10px]"
                    >
                      {s.is_in_bank
                        ? pt
                          ? "No banco"
                          : "In bank"
                        : pt
                          ? "Privada"
                          : "Private"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(s.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/teacher/music/${s.music_slug}/edit`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[11px] font-medium hover:border-foreground/40"
                    >
                      <Pencil className="h-3 w-3" />
                      {pt ? "Editar música" : "Edit song"}
                    </Link>
                    <ShareMusicToBankButton
                      musicSlug={s.music_slug}
                      songTitle={s.title}
                      songCefr={s.cefr_level}
                      songDescription={null}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
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
