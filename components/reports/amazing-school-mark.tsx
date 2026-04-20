/**
 * Print-safe rendition of the Amazing School brand mark — the purple
 * gradient avatar with the smiley + the "Amazing School" italic
 * wordmark. Mirrors the in-app <BrandMark /> but drops every Tailwind
 * class / hover state so the SVG + text survive PDF generation on
 * every browser.
 *
 * Used across every /print/* report (header slot + BrandWatermark).
 * See .claude/CLAUDE.md · "Reports — hard rules".
 */
export function AmazingSchoolMark({
  size = 28,
  wordmark = true,
  tone = "light",
}: {
  /** Pixel diameter of the avatar disc. */
  size?: number;
  /** When true, render the italic "Amazing School" label next to it. */
  wordmark?: boolean;
  /** "light" → dark-on-light palette (default, for printed PDFs).
      "dark"  → dark-background variant for screen chrome. */
  tone?: "light" | "dark";
}) {
  const gradientId = `as-mark-grad-${size}`;
  const faceColor = "#ffffff";
  const wordmarkColor = tone === "dark" ? "#e0e1ff" : "#312e81";
  return (
    <span
      aria-label="Amazing School"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.max(8, Math.round(size / 3)),
        lineHeight: 1,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="img"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="55%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="8"
          fill={`url(#${gradientId})`}
        />
        {/* Eyes */}
        <circle cx="12" cy="13" r="1.5" fill={faceColor} />
        <circle cx="20" cy="13" r="1.5" fill={faceColor} />
        {/* Smile */}
        <path
          d="M10 19 Q16 24.5 22 19"
          fill="none"
          stroke={faceColor}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        {/* Sparkle */}
        <path
          d="M23.5 7 L24 8.5 L25.5 9 L24 9.5 L23.5 11 L23 9.5 L21.5 9 L23 8.5 Z"
          fill={faceColor}
        />
      </svg>
      {wordmark ? (
        <span
          style={{
            fontFamily:
              'var(--font-display), "Instrument Serif", "Georgia", serif',
            fontStyle: "italic",
            fontSize: Math.max(14, Math.round(size * 0.85)),
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: wordmarkColor,
            lineHeight: 1,
          }}
        >
          Amazing School
        </span>
      ) : null}
    </span>
  );
}
