import musicIndexRaw from "@/content/music/index.json";

export interface MusicMeta {
  slug: string;
  title: string;
  artist: string;
  year: number;
  cefr_level: string;
  difficulty: "easy" | "medium" | "hard";
  genre: string[];
  duration_seconds: number;
}

export interface VocabHook {
  term: string;
  pt: string;
  note: string;
}

export type MusicExercise =
  | {
      type: "listen_and_fill";
      prompt_en: string;
      prompt_pt: string;
      excerpt_before: string;
      blank_hint: string;
      answer: string;
      excerpt_after: string;
      youtube_start: number;
      youtube_end: number;
    }
  | {
      type: "translate_line";
      prompt_en: string;
      prompt_pt: string;
      excerpt: string;
      model_answer_pt: string;
      teacher_note?: string;
    }
  | {
      type: "discussion";
      prompt_en: string;
      prompt_pt: string;
      target_vocab: string[];
    }
  | {
      type: "spot_the_grammar";
      prompt_en: string;
      prompt_pt: string;
      expected: { short: string; full: string }[];
    }
  | {
      type: "word_to_meaning";
      prompt_en: string;
      prompt_pt: string;
      pairs: { en: string; pt: string }[];
    }
  | {
      type: "unscramble_line";
      prompt_en: string;
      prompt_pt: string;
      shuffled: string[];
      answer: string[];
      youtube_start?: number;
    }
  | {
      type: "cloze_multi_choice";
      prompt_en: string;
      prompt_pt: string;
      excerpt_before: string;
      excerpt_after: string;
      options: string[];
      answer_index: number;
      youtube_start: number;
      youtube_end: number;
    }
  | {
      type: "count_word";
      prompt_en: string;
      prompt_pt: string;
      word: string;
      answer: number;
    }
  | {
      type: "line_order";
      prompt_en: string;
      prompt_pt: string;
      excerpts: { text: string; order: number }[];
    };

export interface SingAlongPrompt {
  label_en: string;
  label_pt: string;
  lines: string[];
  start_seconds: number;
  style?: "chorus" | "verse" | "bridge" | "hook";
}

export interface MusicSong extends MusicMeta {
  album: string;
  tempo: "slow" | "mid" | "fast";
  youtube_id: string;
  full_lyrics_url: string;
  full_lyrics_source: string;
  why_this_song: string;
  vocab_hooks: VocabHook[];
  grammar_callouts: string[];
  /** Two to three short sing-along challenges per song. Fair-use short excerpts only. */
  sing_along?: { prompts: SingAlongPrompt[] };
  /**
   * Provenance of timestamps in sing_along + exercises.
   *  - "lrclib": auto-synced from community synced-lyrics data (accurate)
   *  - "manual": hand-authored fallback (approximate, no synced source)
   */
  timing_source?: "lrclib" | "manual";
  /**
   * Vevo-claimed tracks often refuse to embed on youtube-nocookie.com
   * but still play on the classic youtube.com host. Flip this flag on
   * any song that shows a "video unavailable / blocked" error so the
   * board renders it from youtube.com/embed/... instead.
   */
  use_classic_embed?: boolean;
  exercises: MusicExercise[];
  teaching_notes_md: string;
  copyright_notice: string;
}

interface MusicIndex {
  generated_at: string;
  catalog_size_target: number;
  songs: MusicMeta[];
}

const MUSIC_INDEX: MusicIndex = musicIndexRaw as MusicIndex;

export function listMusic(): MusicMeta[] {
  return MUSIC_INDEX.songs;
}

export function getMusic(slug: string): MusicMeta | null {
  return MUSIC_INDEX.songs.find((s) => s.slug === slug) ?? null;
}

export const MUSIC_SLUG_PREFIX = "music:";

/**
 * Builds a Cambridge English→Portuguese dictionary lookup URL for a term.
 * Multi-word entries become hyphenated (e.g. "as long as" → "as-long-as").
 */
export function cambridgeUrl(term: string): string {
  const slug = term
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  return `https://dictionary.cambridge.org/dictionary/english-portuguese/${encodeURIComponent(
    slug
  )}`;
}

function letrasSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Builds a Letras.mus.br URL from artist + title (e.g. letras.mus.br/backstreet-boys/as-long-as-you-love-me/). */
export function letrasUrl(artist: string, title: string): string {
  return `https://www.letras.mus.br/${letrasSlug(artist)}/${letrasSlug(title)}/`;
}


export function isMusicAssignmentSlug(slug: string): boolean {
  return slug.startsWith(MUSIC_SLUG_PREFIX);
}

export function toMusicSlug(rawSlug: string): string {
  return `${MUSIC_SLUG_PREFIX}${rawSlug}`;
}

export function fromAssignmentSlug(slug: string): {
  kind: "lesson" | "music";
  slug: string;
} {
  if (slug.startsWith(MUSIC_SLUG_PREFIX)) {
    return { kind: "music", slug: slug.slice(MUSIC_SLUG_PREFIX.length) };
  }
  return { kind: "lesson", slug };
}

