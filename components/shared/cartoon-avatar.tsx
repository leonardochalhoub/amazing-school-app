import { cn } from "@/lib/utils";

export type AgeGroup = "kid" | "teen" | "adult";
export type Gender = "female" | "male";

interface CartoonAvatarProps {
  ageGroup?: AgeGroup | null;
  gender?: Gender | null;
  seed?: string | null;
  fullName?: string | null;
  className?: string;
}

/**
 * Avatar fallback — OS-native emoji on a soft gradient.
 * The browser / OS renders the emoji (Apple, Google, Microsoft, etc.), so
 * each age × gender combination always looks clean and contextually right.
 * If age or gender isn't set, falls back to a neutral 🙂.
 */
export function CartoonAvatar({
  ageGroup,
  gender,
  fullName,
  seed,
  className,
}: CartoonAvatarProps) {
  const emoji = pickEmoji(ageGroup, gender);
  const gradient = pickGradient(
    (seed ?? fullName ?? `${ageGroup}-${gender}`) || "x"
  );

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br",
        gradient,
        className
      )}
      aria-label={fullName ?? "avatar"}
      style={{ containerType: "inline-size" }}
    >
      <span
        role="img"
        aria-hidden
        className="select-none leading-none"
        style={{
          fontSize: "min(60cqw, 3.5rem)",
          lineHeight: 1,
          fontFamily:
            '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","EmojiOne Color","Android Emoji","Twemoji Mozilla",sans-serif',
          fontVariantEmoji: "emoji",
        }}
      >
        {emoji}
      </span>
    </div>
  );
}

function pickEmoji(age?: AgeGroup | null, gender?: Gender | null): string {
  // If age is missing, fall back to gender-alone (adult emoji).
  if (!age) {
    if (gender === "female") return "👩";
    if (gender === "male") return "👨";
    return "🧑";
  }
  if (age === "kid") {
    if (gender === "female") return "👧";
    if (gender === "male") return "👦";
    return "🧒";
  }
  if (age === "teen") {
    if (gender === "female") return "👩‍🎓";
    if (gender === "male") return "👨‍🎓";
    return "🧑‍🎓";
  }
  // adult
  if (gender === "female") return "👩";
  if (gender === "male") return "👨";
  return "🧑";
}

const GRADIENTS = [
  "from-pink-200 to-sky-200",
  "from-violet-200 to-indigo-200",
  "from-amber-200 to-rose-200",
  "from-emerald-200 to-teal-200",
  "from-sky-200 to-blue-200",
  "from-fuchsia-200 to-pink-200",
  "from-lime-200 to-emerald-200",
  "from-cyan-200 to-sky-200",
];

function pickGradient(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}
