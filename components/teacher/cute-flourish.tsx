/**
 * Decorative SVG bouquet shown in the teacher hero for female
 * teachers. Pure SVG so nothing loads from the network and the
 * palette fits inside the existing indigo → violet → pink theme
 * of the dashboard.
 *
 * Positioned absolutely by the caller; the element itself is
 * purely visual (aria-hidden) and sized via CSS variables.
 */
export function CuteFlourish({
  size = 160,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <radialGradient id="cute-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbcfe8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cute-pink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9a8d4" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="cute-violet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="cute-peach" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>

      {/* Soft glow behind the bouquet */}
      <circle cx="100" cy="100" r="90" fill="url(#cute-glow)" />

      {/* Main flower — pink peony */}
      <g transform="translate(100 95)">
        <g transform="rotate(-12)">
          <circle cx="0" cy="-18" r="12" fill="url(#cute-pink)" />
          <circle cx="16" cy="-6" r="12" fill="url(#cute-pink)" />
          <circle cx="10" cy="14" r="12" fill="url(#cute-pink)" />
          <circle cx="-10" cy="14" r="12" fill="url(#cute-pink)" />
          <circle cx="-16" cy="-6" r="12" fill="url(#cute-pink)" />
          <circle cx="0" cy="0" r="7" fill="#fef3c7" />
        </g>
      </g>

      {/* Violet daisy, upper-left */}
      <g transform="translate(62 60)">
        <g transform="rotate(18)">
          <ellipse cx="0" cy="-14" rx="5" ry="9" fill="url(#cute-violet)" />
          <ellipse cx="14" cy="0" rx="9" ry="5" fill="url(#cute-violet)" />
          <ellipse cx="0" cy="14" rx="5" ry="9" fill="url(#cute-violet)" />
          <ellipse cx="-14" cy="0" rx="9" ry="5" fill="url(#cute-violet)" />
          <circle cx="0" cy="0" r="5" fill="#fff7ed" />
        </g>
      </g>

      {/* Peach tulip, lower-right */}
      <g transform="translate(142 130)">
        <g transform="rotate(-8)">
          <path
            d="M -10 8 Q -12 -8 0 -14 Q 12 -8 10 8 Q 0 6 -10 8 Z"
            fill="url(#cute-peach)"
          />
          <path
            d="M 0 6 Q 2 -4 8 -2 Q 4 2 0 6 Z"
            fill="#fff7ed"
            opacity="0.7"
          />
        </g>
      </g>

      {/* Tiny green leaves */}
      <g fill="#86efac" opacity="0.85">
        <path d="M 64 108 Q 48 102 46 122 Q 58 124 64 108 Z" />
        <path d="M 134 72 Q 152 68 154 88 Q 142 88 134 72 Z" />
      </g>

      {/* Sparkles */}
      <g fill="#fde68a">
        <path d="M 40 40 L 42 48 L 50 50 L 42 52 L 40 60 L 38 52 L 30 50 L 38 48 Z" />
        <path d="M 160 46 L 161.5 52 L 167 53 L 161.5 54 L 160 60 L 158.5 54 L 153 53 L 158.5 52 Z" />
        <path d="M 48 150 L 49 154 L 53 155 L 49 156 L 48 160 L 47 156 L 43 155 L 47 154 Z" />
      </g>

      {/* Little heart */}
      <path
        d="M 170 120 C 174 114, 184 116, 180 126 C 178 132, 170 138, 166 138 C 162 138, 154 132, 152 126 C 148 116, 158 114, 162 120 Z"
        fill="#fb7185"
        opacity="0.85"
        transform="scale(0.7) translate(30 20)"
      />
    </svg>
  );
}
