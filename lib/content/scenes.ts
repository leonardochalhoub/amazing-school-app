import charactersRaw from "@/content/characters.json";

export interface Character {
  id: string;
  name: string;
  age: number;
  emoji: string;
  color: string;
  one_liner_en: string;
  one_liner_pt: string;
  speaking_style: string;
}

interface CharactersFile {
  generated_at: string;
  setting: {
    school_name: string;
    city: string;
    description_en: string;
    description_pt: string;
  };
  characters: Character[];
}

const DATA = charactersRaw as CharactersFile;

export function getCharacter(id: string): Character | null {
  return DATA.characters.find((c) => c.id === id) ?? null;
}

export function getCharacters(): Character[] {
  return DATA.characters;
}

export function getSchoolSetting() {
  return DATA.setting;
}

/**
 * A narrative lesson is a sequence of scenes the player advances through.
 * Each scene has a discriminator and scene-specific fields — the player
 * switches on `kind` and renders the right component.
 */
export type LessonScene =
  | NarrativeScene
  | DialogueScene
  | ExerciseScene
  | GrammarNoteScene
  | VocabIntroScene
  | ChapterTitleScene
  | PronunciationScene
  | DialogPronunciationScene
  | ReadingScene
  | ListeningScene
  | FurtherReadingScene;

/**
 * Interactive dialog drill: the AI speaks ≥5 lines via TTS, student
 * responds on each user turn (4-8 turns total), each user turn is
 * transcribed by Groq Whisper and scored.
 */
export interface DialogPronunciationScene {
  kind: "dialog_pronunciation";
  title: string;
  character?: string;
  pt_summary?: string;
  turns: (
    | { speaker: "ai"; text: string; pt?: string }
    | { speaker: "user"; target: string; pt_hint?: string }
  )[];
}

/**
 * Paragraph-length reading passage with optional comprehension question.
 */
export interface ReadingScene {
  kind: "reading";
  title?: string;
  passage_en: string;
  passage_pt?: string;
  check?: {
    question: string;
    options: string[];
    correct: number;
    explanation?: string;
    hint_pt_br?: string;
  };
}

/**
 * TTS-driven listening task: browser speechSynthesis reads the passage,
 * then the student answers a comprehension question.
 */
export interface ListeningScene {
  kind: "listening";
  title?: string;
  audio_text_en: string;
  audio_text_pt?: string;
  check?: {
    question: string;
    options: string[];
    correct: number;
    explanation?: string;
    hint_pt_br?: string;
  };
}

/**
 * Curated external free resource links — BBC Learning English, VOA,
 * British Council, Cambridge Dictionary. Students can go deeper offline.
 */
export interface FurtherReadingScene {
  kind: "further_reading";
  title?: string;
  body_pt?: string;
  sources: { label: string; url: string; pt_hint?: string }[];
}

/**
 * Audio pronunciation exercise: student records themselves saying the
 * target phrase, Groq Whisper transcribes, similarity score is shown.
 */
export interface PronunciationScene {
  kind: "pronunciation";
  target_en: string;
  target_pt?: string;
  framing_character_id?: string;
}

export interface ChapterTitleScene {
  kind: "chapter_title";
  chapter: string;
  subtitle_en?: string;
  subtitle_pt?: string;
}

/**
 * Prose that moves the story forward. Optionally anchored to a character
 * (face peeks in from the side) and can display a short image caption.
 */
export interface NarrativeScene {
  kind: "narrative";
  text_en: string;
  text_pt?: string;
  character_id?: string;
  scene_emoji?: string;
}

export interface DialogueTurn {
  character_id: string;
  en: string;
  pt?: string;
}

export interface DialogueScene {
  kind: "dialogue";
  location_en?: string;
  location_pt?: string;
  turns: DialogueTurn[];
}

export interface ExerciseScene {
  kind: "exercise";
  exercise: {
    id: string;
    type: "multiple_choice" | "fill_blank" | "matching";
    question?: string;
    options?: string[];
    correct?: number | string;
    pairs?: [string, string][];
    explanation?: string;
    hint_pt_br?: string;
  };
  /** Optional framing from a character ("Bia says: your turn!"). */
  framing_character_id?: string;
}

export interface GrammarNoteScene {
  kind: "grammar_note";
  title: string;
  body_en: string;
  body_pt?: string;
  examples?: { en: string; pt?: string }[];
}

export interface VocabIntroScene {
  kind: "vocab_intro";
  title?: string;
  items: { term: string; pt: string; example_en?: string }[];
}

/** The authored-lesson shape once scenes are adopted. */
export interface NarrativeLesson {
  slug: string;
  title: string;
  description: string;
  category: "vocabulary" | "grammar" | "reading" | "speaking" | "listening";
  level: "A1" | "A2" | "B1" | "B2";
  cefr_level: string;
  xp_reward: number;
  estimated_minutes: number;
  summary_pt_br?: string;
  scenes: LessonScene[];
}
