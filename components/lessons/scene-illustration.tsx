/**
 * Inline SVG scene illustrations — hand-authored, responsive, theme-aware.
 * No external assets, no copyright issues, works offline.
 *
 * Add a case for each scene-emoji we want to dress up. Fallback stays the
 * plain big emoji so unmatched scenes still look intentional.
 */
interface Props {
  emoji?: string;
  color?: string;
  className?: string;
}

const SunriseScene = ({ color = "#f59e0b" }: { color?: string }) => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <defs>
      <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#fca5a5" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <rect width="400" height="160" fill="url(#sky)" />
    <circle cx="200" cy="120" r="50" fill={color} />
    <path d="M0 125 Q100 110 200 125 T400 125 L400 160 L0 160 Z" fill="#0f172a" opacity="0.35" />
    <path d="M0 145 Q80 135 160 145 T320 145 T400 145 L400 160 L0 160 Z" fill="#0f172a" opacity="0.6" />
  </svg>
);

const OceanScene = ({ color = "#0ea5e9" }: { color?: string }) => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <defs>
      <linearGradient id="ocean" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor={color} />
      </linearGradient>
    </defs>
    <rect width="400" height="160" fill="url(#ocean)" />
    <path d="M0 90 Q100 70 200 90 T400 90 L400 160 L0 160 Z" fill="#0369a1" opacity="0.5" />
    <path d="M0 110 Q80 95 160 110 T320 110 T400 110 L400 160 L0 160 Z" fill="#0c4a6e" opacity="0.7" />
    <circle cx="330" cy="45" r="18" fill="#fef3c7" />
  </svg>
);

const ClassroomScene = () => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <rect width="400" height="160" fill="#e0e7ff" />
    <rect x="50" y="30" width="300" height="80" rx="4" fill="#1e293b" />
    <text x="200" y="70" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#fbbf24">
      AMAZING
    </text>
    <text x="200" y="95" textAnchor="middle" fontSize="20" fill="#ffffff">
      SCHOOL
    </text>
    <rect x="70" y="120" width="40" height="30" fill="#92400e" />
    <rect x="150" y="120" width="40" height="30" fill="#92400e" />
    <rect x="230" y="120" width="40" height="30" fill="#92400e" />
    <rect x="310" y="120" width="40" height="30" fill="#92400e" />
  </svg>
);

const FoodTruckScene = ({ color = "#f59e0b" }: { color?: string }) => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <rect width="400" height="160" fill="#fef3c7" />
    <rect x="80" y="60" width="240" height="70" rx="8" fill={color} />
    <rect x="100" y="75" width="40" height="30" fill="#fef3c7" />
    <rect x="160" y="75" width="40" height="30" fill="#fef3c7" />
    <rect x="220" y="75" width="40" height="30" fill="#fef3c7" />
    <text x="200" y="55" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#92400e">
      TROPICAL BITES
    </text>
    <circle cx="120" cy="140" r="14" fill="#1e293b" />
    <circle cx="120" cy="140" r="6" fill="#475569" />
    <circle cx="280" cy="140" r="14" fill="#1e293b" />
    <circle cx="280" cy="140" r="6" fill="#475569" />
  </svg>
);

const MusicScene = ({ color = "#8b5cf6" }: { color?: string }) => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <defs>
      <linearGradient id="musicBg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#c4b5fd" />
        <stop offset="100%" stopColor={color} />
      </linearGradient>
    </defs>
    <rect width="400" height="160" fill="url(#musicBg)" />
    <circle cx="80" cy="80" r="22" fill="#ffffff" opacity="0.9" />
    <circle cx="80" cy="80" r="6" fill={color} />
    <path d="M80 58 L80 30 L120 22 L120 50" stroke="#ffffff" strokeWidth="3" fill="none" />
    <circle cx="140" cy="110" r="8" fill="#ffffff" opacity="0.6" />
    <circle cx="220" cy="50" r="5" fill="#ffffff" opacity="0.7" />
    <circle cx="300" cy="90" r="10" fill="#ffffff" opacity="0.6" />
    <circle cx="350" cy="40" r="4" fill="#ffffff" opacity="0.8" />
  </svg>
);

const LetterScene = ({ color = "#ec4899" }: { color?: string }) => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <rect width="400" height="160" fill="#fce7f3" />
    <rect x="100" y="30" width="200" height="120" rx="4" fill="#ffffff" stroke="#fbcfe8" strokeWidth="2" />
    <line x1="120" y1="60" x2="280" y2="60" stroke="#9ca3af" strokeWidth="1" />
    <line x1="120" y1="75" x2="280" y2="75" stroke="#9ca3af" strokeWidth="1" />
    <line x1="120" y1="90" x2="260" y2="90" stroke="#9ca3af" strokeWidth="1" />
    <line x1="120" y1="105" x2="240" y2="105" stroke="#9ca3af" strokeWidth="1" />
    <path d="M280 130 L290 115 L300 130 L295 145 L285 145 Z" fill={color} />
  </svg>
);

const TechScene = ({ color = "#8b5cf6" }: { color?: string }) => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <rect width="400" height="160" fill="#0f172a" />
    <rect x="60" y="40" width="280" height="80" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" />
    <circle cx="75" cy="55" r="3" fill="#ef4444" />
    <circle cx="88" cy="55" r="3" fill="#f59e0b" />
    <circle cx="101" cy="55" r="3" fill="#10b981" />
    <text x="80" y="80" fontSize="10" fontFamily="monospace" fill="#10b981">
      {"$ deploy --prod"}
    </text>
    <text x="80" y="95" fontSize="10" fontFamily="monospace" fill="#38bdf8">
      {"✓ shipped"}
    </text>
    <text x="80" y="110" fontSize="10" fontFamily="monospace" fill={color}>
      {"▍"}
    </text>
  </svg>
);

const FamilyScene = () => (
  <svg viewBox="0 0 400 160" className="h-full w-full">
    <rect width="400" height="160" fill="#fce7f3" />
    <circle cx="120" cy="75" r="30" fill="#fb7185" />
    <circle cx="180" cy="75" r="30" fill="#60a5fa" />
    <circle cx="240" cy="75" r="30" fill="#fcd34d" />
    <circle cx="300" cy="75" r="30" fill="#a78bfa" />
    <circle cx="120" cy="75" r="20" fill="#fff" opacity="0.9" />
    <circle cx="180" cy="75" r="20" fill="#fff" opacity="0.9" />
    <circle cx="240" cy="75" r="20" fill="#fff" opacity="0.9" />
    <circle cx="300" cy="75" r="20" fill="#fff" opacity="0.9" />
    <text x="120" y="82" textAnchor="middle" fontSize="22">👵</text>
    <text x="180" y="82" textAnchor="middle" fontSize="22">👨</text>
    <text x="240" y="82" textAnchor="middle" fontSize="22">👩</text>
    <text x="300" y="82" textAnchor="middle" fontSize="22">🧑</text>
    <path d="M120 110 L180 110 L240 110 L300 110" stroke="#9ca3af" strokeWidth="2" />
  </svg>
);

/**
 * Picks the illustration based on the scene_emoji hint. Unknown hints
 * fall back to the emoji rendered huge.
 */
export function SceneIllustration({ emoji, color = "#6366f1", className }: Props) {
  const map: Record<string, React.ReactNode> = {
    "🌅": <SunriseScene color={color} />,
    "🌊": <OceanScene color={color} />,
    "🏄‍♀️": <OceanScene color="#0ea5e9" />,
    "🏫": <ClassroomScene />,
    "🎒": <ClassroomScene />,
    "🌮": <FoodTruckScene />,
    "🍴": <FoodTruckScene />,
    "🎵": <MusicScene color={color} />,
    "🎶": <MusicScene color={color} />,
    "🎧": <MusicScene color={color} />,
    "💌": <LetterScene color={color} />,
    "📬": <LetterScene color={color} />,
    "💻": <TechScene color={color} />,
    "👨‍👩‍👧": <FamilyScene />,
    "👨‍👩‍👦": <FamilyScene />,
  };
  const illustration = emoji ? map[emoji] : null;
  return (
    <div
      className={`relative h-32 w-full overflow-hidden rounded-xl ${className ?? ""}`}
    >
      {illustration ?? (
        <div
          className="flex h-full w-full items-center justify-center text-6xl"
          style={{
            background: `linear-gradient(135deg, ${color}33, ${color}11)`,
          }}
        >
          {emoji}
        </div>
      )}
    </div>
  );
}
