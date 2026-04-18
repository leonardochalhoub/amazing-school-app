"use client";

import { useMemo } from "react";

/**
 * Scene illustrations via Pollinations.ai — free, no API key, no auth.
 *
 *   https://image.pollinations.ai/prompt/{URL-encoded prompt}
 *
 * Cheap strategy: the URL IS the cache key. Same prompt → same image.
 * We bake the character hint + scene text into the prompt so each scene
 * gets a unique but stable result.
 *
 * Query params: ?width=800&height=400&nologo=true&model=flux
 */
interface Props {
  emoji?: string;
  color?: string;
  className?: string;
  /** Short text used as the prompt — usually the scene's English narrative. */
  promptText?: string;
  /** Optional character hint like 'Bia the surfer'. */
  characterHint?: string;
}

const BASE = "https://image.pollinations.ai/prompt/";

function buildPrompt({
  emoji,
  promptText,
  characterHint,
}: {
  emoji?: string;
  promptText?: string;
  characterHint?: string;
}): string {
  // Strong style anchors so the whole app feels like one illustrated world.
  const style =
    "warm flat illustration, bright cheerful colors, children's book style, " +
    "Brazilian coastal town setting, soft shading, no text, no letters, no words";

  // Map scene_emoji hints → concrete subjects the model renders well.
  const emojiToSubject: Record<string, string> = {
    "🌅": "sunrise over a tropical beach in Brazil",
    "🌊": "big blue ocean waves at a Brazilian beach",
    "🏄‍♀️": "teenage girl surfing a wave on a yellow surfboard",
    "🏫": "cozy small English-language school building on a tropical coastal street",
    "🎒": "classroom with a friendly teacher and a few students at wooden desks",
    "🌮": "cheerful yellow food truck selling tacos on a sunny beach road",
    "🍴": "rustic table with tacos, tropical fruits, and coconut drinks",
    "🎵": "vintage vinyl record with floating musical notes, warm sunset",
    "🎶": "wooden rooftop terrace with a music speaker and ocean view",
    "🎧": "pair of headphones resting on a beach towel at golden hour",
    "💌": "old handwritten letter on a wooden table with pressed flowers",
    "📬": "vintage postbox on a stone wall, soft afternoon light",
    "💻": "laptop on a wooden desk with a coffee, overlooking a calm beach",
    "👨‍👩‍👧": "happy Brazilian family smiling together",
    "👨‍👩‍👦": "family portrait at a seaside home",
    "🐕": "happy yellow Labrador dog running on a beach",
    "📘": "open English textbook on a sunny wooden table with flowers",
    "🧠": "young girl reading a book surrounded by floating letters",
  };

  const subject =
    emoji && emojiToSubject[emoji] ? emojiToSubject[emoji] : "tropical coastal scene";

  const parts = [
    subject,
    characterHint ? `featuring ${characterHint}` : "",
    promptText ? `scene: ${promptText.slice(0, 160)}` : "",
    style,
  ].filter(Boolean);

  return parts.join(", ");
}

export function SceneIllustration({
  emoji,
  color = "#6366f1",
  className,
  promptText,
  characterHint,
}: Props) {
  const url = useMemo(() => {
    const prompt = buildPrompt({ emoji, promptText, characterHint });
    return `${BASE}${encodeURIComponent(prompt)}?width=800&height=400&nologo=true&model=flux`;
  }, [emoji, promptText, characterHint]);

  return (
    <div
      className={`relative aspect-[2/1] w-full overflow-hidden rounded-xl shadow-md ${className ?? ""}`}
      style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}
    >
      {/* Shimmer while Pollinations renders (first paint ~1–3s). */}
      <div
        aria-hidden
        className="absolute inset-0 animate-pulse"
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading="lazy"
        className="relative h-full w-full object-cover"
      />
    </div>
  );
}
