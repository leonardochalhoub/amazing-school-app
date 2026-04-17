"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Music2, Pencil, Search, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MusicMeta } from "@/lib/content/music";

const CEFR_ORDER = [
  "a1.1","a1.2","a2.1","a2.2","b1.1","b1.2","b2.1","b2.2","c1.1","c1.2",
];

interface Props {
  songs: MusicMeta[];
  variant?: "student" | "teacher";
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const CEFR_GROUPS = ["a1", "a2", "b1", "b2", "c1"] as const;
type CefrGroup = (typeof CEFR_GROUPS)[number] | "all";
const TOP_GENRES_LIMIT = 10;

export function MusicCatalog({ songs, variant = "student" }: Props) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<CefrGroup>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");

  // Top N genres across the whole catalog (by song count).
  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of songs) {
      for (const g of s.genre ?? []) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_GENRES_LIMIT);
  }, [songs]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return songs.filter((s) => {
      if (levelFilter !== "all" && !s.cefr_level.startsWith(levelFilter)) {
        return false;
      }
      if (genreFilter !== "all" && !(s.genre ?? []).includes(genreFilter)) {
        return false;
      }
      if (!q) return true;
      const hay = normalize(`${s.title} ${s.artist} ${s.year}`);
      return hay.includes(q);
    });
  }, [songs, query, levelFilter, genreFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ai = CEFR_ORDER.indexOf(a.cefr_level);
      const bi = CEFR_ORDER.indexOf(b.cefr_level);
      if (ai !== bi) return ai - bi;
      return a.artist.localeCompare(b.artist);
    });
  }, [filtered]);

  const byLevel = useMemo(() => {
    const m = new Map<string, MusicMeta[]>();
    for (const s of sorted) {
      const list = m.get(s.cefr_level) ?? [];
      list.push(s);
      m.set(s.cefr_level, list);
    }
    return m;
  }, [sorted]);

  // Per-group counts for the filter chips so students see how many songs
  // are available at each level at a glance.
  const levelCounts = useMemo(() => {
    const c: Record<string, number> = { all: songs.length };
    for (const group of CEFR_GROUPS) c[group] = 0;
    for (const s of songs) {
      const g = s.cefr_level.slice(0, 2);
      if (c[g] !== undefined) c[g] += 1;
    }
    return c;
  }, [songs]);

  const isFiltering =
    query.trim().length > 0 || levelFilter !== "all" || genreFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative max-w-md flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by song title, artist, or year…"
            className="h-9 pl-8"
          />
        </div>
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-xs">
          {(["all", ...CEFR_GROUPS] as const).map((g) => {
            const active = levelFilter === g;
            const count = levelCounts[g] ?? 0;
            if (count === 0 && g !== "all") return null;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setLevelFilter(g)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  active
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {g === "all" ? "All" : g.toUpperCase()}
                <span className="ml-1 text-[10px] opacity-60 tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setGenreFilter("all")}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
            genreFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          All genres
        </button>
        {topGenres.map(([g, n]) => {
          const active = genreFilter === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGenreFilter(active ? "all" : g)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {g.replace(/-/g, " ")}
              <span className="ml-1 opacity-60 tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>

      {isFiltering && (
        <p className="-mt-4 text-xs text-muted-foreground">
          {sorted.length} match{sorted.length === 1 ? "" : "es"}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {query
            ? `No songs match "${query}"${levelFilter !== "all" ? ` at ${levelFilter.toUpperCase()}` : ""}.`
            : `No songs at ${levelFilter.toUpperCase()} yet.`}
        </p>
      ) : (
        Array.from(byLevel.entries()).map(([level, levelSongs]) => (
          <section key={level} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {level.toUpperCase()}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {levelSongs.map((s) => (
                <SongCard key={s.slug} song={s} variant={variant} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function SongCard({
  song,
  variant,
}: {
  song: MusicMeta;
  variant: "student" | "teacher";
}) {
  const minutes = Math.floor(song.duration_seconds / 60);
  const seconds = song.duration_seconds % 60;
  const timeLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

  if (variant === "teacher") {
    return (
      <Card className="transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardContent className="space-y-3 p-4">
          <Link href={`/student/music/${song.slug}`} className="group block">
            <div className="flex items-start gap-2">
              <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight group-hover:text-primary">
                  {song.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {song.artist} · {song.year}
                </p>
              </div>
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {song.cefr_level.toUpperCase()}
            </Badge>
            <span>{song.genre.slice(0, 2).join(" · ")}</span>
            <span className="ml-auto inline-flex items-center gap-0.5 tabular-nums">
              <Clock className="h-3 w-3" />
              {timeLabel}
            </span>
          </div>
          <div className="flex justify-end pt-1">
            <Link
              href={`/teacher/music/${song.slug}/edit`}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <Pencil className="h-3 w-3" />
              Personalize
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={`/student/music/${song.slug}`} className="group block">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-2">
            <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">{song.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {song.artist} · {song.year}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {song.cefr_level.toUpperCase()}
            </Badge>
            <span>{song.genre.slice(0, 2).join(" · ")}</span>
            <span className="ml-auto inline-flex items-center gap-0.5 tabular-nums">
              <Clock className="h-3 w-3" />
              {timeLabel}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
