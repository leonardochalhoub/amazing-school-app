import type { ReactNode } from "react";

/**
 * 50 hand-drawn SVG "super cute" illustrations for the female student
 * hero. Same spirit as `components/teacher/cute-flourish.tsx` — pure
 * SVG shapes, no emojis, no network fetches, palette tuned to the
 * indigo → violet → pink dashboard theme.
 *
 * Each art is a tiny scene (10–40 shapes): flower bouquets, puppies,
 * panda faces, teddy bears, cupcakes, makeup, sparkles, ribbons.
 * The picker returns one deterministically by seed so callers can
 * re-pick on every request.
 */

interface CuteArtProps {
  size?: number;
}

type CuteArtRenderer = (p: CuteArtProps) => ReactNode;

/* ------------------------------------------------------------------ */
/* Shared shape atoms                                                  */
/* ------------------------------------------------------------------ */

const GRADIENTS = (
  <>
    <linearGradient id="cute-pink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fbcfe8" />
      <stop offset="100%" stopColor="#ec4899" />
    </linearGradient>
    <linearGradient id="cute-rose" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fda4af" />
      <stop offset="100%" stopColor="#e11d48" />
    </linearGradient>
    <linearGradient id="cute-violet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#c4b5fd" />
      <stop offset="100%" stopColor="#8b5cf6" />
    </linearGradient>
    <linearGradient id="cute-peach" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fed7aa" />
      <stop offset="100%" stopColor="#fb923c" />
    </linearGradient>
    <linearGradient id="cute-butter" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fde68a" />
      <stop offset="100%" stopColor="#f59e0b" />
    </linearGradient>
    <linearGradient id="cute-mint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#bbf7d0" />
      <stop offset="100%" stopColor="#34d399" />
    </linearGradient>
    <linearGradient id="cute-sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#bae6fd" />
      <stop offset="100%" stopColor="#38bdf8" />
    </linearGradient>
    <linearGradient id="cute-fawn" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fde68a" />
      <stop offset="100%" stopColor="#a16207" />
    </linearGradient>
    <radialGradient id="cute-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.55" />
      <stop offset="100%" stopColor="#fbcfe8" stopOpacity="0" />
    </radialGradient>
  </>
);

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M ${x} ${y} L ${x + 2 * s} ${y + 8 * s} L ${x + 10 * s} ${y + 10 * s} L ${x + 2 * s} ${y + 12 * s} L ${x} ${y + 20 * s} L ${x - 2 * s} ${y + 12 * s} L ${x - 10 * s} ${y + 10 * s} L ${x - 2 * s} ${y + 8 * s} Z`}
      fill="#fde68a"
    />
  );
}

function Heart({
  x,
  y,
  s = 1,
  fill = "#fb7185",
  opacity = 1,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  opacity?: number;
}) {
  return (
    <path
      d={`M ${x} ${y} c ${4 * s} ${-6 * s}, ${14 * s} ${-4 * s}, ${10 * s} ${6 * s} c ${-2 * s} ${6 * s}, ${-10 * s} ${12 * s}, ${-10 * s} ${12 * s} c 0 0, ${-8 * s} ${-6 * s}, ${-10 * s} ${-12 * s} c ${-4 * s} ${-10 * s}, ${6 * s} ${-12 * s}, ${10 * s} ${-6 * s} Z`}
      fill={fill}
      opacity={opacity}
    />
  );
}

function Flower({
  cx,
  cy,
  petalFill,
  centerFill = "#fef3c7",
  r = 10,
  rot = 0,
}: {
  cx: number;
  cy: number;
  petalFill: string;
  centerFill?: string;
  r?: number;
  rot?: number;
}) {
  const petal = r * 0.75;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <circle cx="0" cy={-r} r={petal} fill={petalFill} />
      <circle cx={r * 0.9} cy={-r * 0.3} r={petal} fill={petalFill} />
      <circle cx={r * 0.6} cy={r * 0.8} r={petal} fill={petalFill} />
      <circle cx={-r * 0.6} cy={r * 0.8} r={petal} fill={petalFill} />
      <circle cx={-r * 0.9} cy={-r * 0.3} r={petal} fill={petalFill} />
      <circle cx="0" cy="0" r={r * 0.45} fill={centerFill} />
    </g>
  );
}

function Leaf({
  x,
  y,
  rot = 0,
  fill = "#86efac",
}: {
  x: number;
  y: number;
  rot?: number;
  fill?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path
        d="M 0 0 Q 6 -16 18 -8 Q 14 6 0 0 Z"
        fill={fill}
        opacity="0.85"
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 50 scene renderers                                                  */
/* ------------------------------------------------------------------ */

const ARTS: CuteArtRenderer[] = [
  // 1. Pink peony bouquet (inspired by CuteFlourish)
  () => (
    <>
      <Flower cx={100} cy={95} petalFill="url(#cute-pink)" r={18} />
      <Flower cx={62} cy={62} petalFill="url(#cute-violet)" r={13} rot={18} />
      <Flower cx={138} cy={128} petalFill="url(#cute-peach)" r={12} rot={-8} />
      <Leaf x={64} y={110} rot={20} />
      <Leaf x={134} y={72} rot={-120} />
      <Sparkle x={40} y={40} />
      <Sparkle x={160} y={48} s={0.6} />
    </>
  ),
  // 2. Sunflower trio
  () => (
    <>
      <Flower cx={100} cy={100} petalFill="url(#cute-butter)" r={20} />
      <Flower cx={60} cy={75} petalFill="url(#cute-butter)" r={12} />
      <Flower cx={140} cy={125} petalFill="url(#cute-butter)" r={12} rot={12} />
      <Leaf x={72} y={118} rot={40} fill="#4ade80" />
    </>
  ),
  // 3. Daisy chain
  () => (
    <>
      {[30, 60, 95, 130, 165].map((x, i) => (
        <Flower
          key={i}
          cx={x}
          cy={100 + (i % 2 ? -6 : 6)}
          petalFill="#ffffff"
          centerFill="#fde68a"
          r={10}
        />
      ))}
    </>
  ),
  // 4. Single rose
  () => (
    <>
      <g transform="translate(100 100)">
        <path
          d="M 0 -22 Q 18 -18 18 0 Q 18 18 0 22 Q -18 18 -18 0 Q -18 -18 0 -22 Z"
          fill="url(#cute-rose)"
        />
        <path
          d="M -8 -4 Q 0 -14 8 -4 Q 0 4 -8 -4 Z"
          fill="#fff"
          opacity="0.5"
        />
      </g>
      <Leaf x={130} y={118} rot={-30} />
    </>
  ),
  // 5. Tulip pair
  () => (
    <>
      <g transform="translate(80 105)">
        <path
          d="M -14 10 Q -16 -10 0 -16 Q 16 -10 14 10 Q 0 8 -14 10 Z"
          fill="url(#cute-rose)"
        />
      </g>
      <g transform="translate(130 110)">
        <path
          d="M -12 8 Q -14 -8 0 -14 Q 14 -8 12 8 Q 0 6 -12 8 Z"
          fill="url(#cute-violet)"
        />
      </g>
      <Leaf x={100} y={138} rot={80} />
    </>
  ),
  // 6. Cherry blossom branch
  () => (
    <>
      <path
        d="M 20 130 Q 80 100 180 60"
        stroke="#b45309"
        strokeWidth="3"
        fill="none"
      />
      <Flower cx={60} cy={114} petalFill="#fbcfe8" r={9} />
      <Flower cx={100} cy={92} petalFill="#f9a8d4" r={11} />
      <Flower cx={140} cy={80} petalFill="#fbcfe8" r={9} rot={20} />
      <Flower cx={170} cy={64} petalFill="#f472b6" r={8} rot={30} />
    </>
  ),
  // 7. Lotus
  () => (
    <>
      <g transform="translate(100 110)">
        <path
          d="M 0 -20 Q 24 -10 22 12 Q 0 18 -22 12 Q -24 -10 0 -20 Z"
          fill="url(#cute-pink)"
        />
        <path
          d="M 0 -10 Q 14 -2 12 10 Q 0 12 -12 10 Q -14 -2 0 -10 Z"
          fill="#fff"
          opacity="0.6"
        />
      </g>
    </>
  ),
  // 8. Clover
  () => (
    <>
      <g transform="translate(100 100)">
        <circle cx="0" cy="-14" r="10" fill="#34d399" />
        <circle cx="14" cy="0" r="10" fill="#34d399" />
        <circle cx="-14" cy="0" r="10" fill="#34d399" />
        <circle cx="0" cy="14" r="10" fill="#4ade80" />
      </g>
    </>
  ),
  // 9. Dog face (puppy)
  () => (
    <g transform="translate(100 100)">
      <ellipse cx="0" cy="4" rx="34" ry="30" fill="url(#cute-fawn)" />
      <ellipse cx="-28" cy="-14" rx="12" ry="18" fill="#b45309" transform="rotate(-20 -28 -14)" />
      <ellipse cx="28" cy="-14" rx="12" ry="18" fill="#b45309" transform="rotate(20 28 -14)" />
      <circle cx="-10" cy="-2" r="3" fill="#1f2937" />
      <circle cx="10" cy="-2" r="3" fill="#1f2937" />
      <ellipse cx="0" cy="10" rx="5" ry="4" fill="#1f2937" />
      <path d="M -6 14 Q 0 20 6 14" stroke="#1f2937" strokeWidth="2" fill="none" />
    </g>
  ),
  // 10. Dog with floppy ears
  () => (
    <g transform="translate(100 100)">
      <path d="M -40 -20 Q -36 -40 -20 -28 Q -26 -6 -40 -20 Z" fill="#78350f" />
      <path d="M 40 -20 Q 36 -40 20 -28 Q 26 -6 40 -20 Z" fill="#78350f" />
      <ellipse cx="0" cy="4" rx="32" ry="28" fill="#fde68a" />
      <circle cx="-10" cy="-2" r="3" fill="#1f2937" />
      <circle cx="10" cy="-2" r="3" fill="#1f2937" />
      <ellipse cx="0" cy="10" rx="4" ry="3" fill="#1f2937" />
      <path d="M 10 20 Q 18 26 28 18" stroke="#78350f" strokeWidth="2" fill="none" />
    </g>
  ),
  // 11. Poodle
  () => (
    <g transform="translate(100 100)">
      <circle cx="-20" cy="-18" r="14" fill="#f9a8d4" />
      <circle cx="20" cy="-18" r="14" fill="#f9a8d4" />
      <circle cx="0" cy="-24" r="14" fill="#f9a8d4" />
      <ellipse cx="0" cy="6" rx="30" ry="24" fill="#fbcfe8" />
      <circle cx="-10" cy="2" r="3" fill="#1f2937" />
      <circle cx="10" cy="2" r="3" fill="#1f2937" />
      <ellipse cx="0" cy="12" rx="4" ry="3" fill="#1f2937" />
    </g>
  ),
  // 12. Paw prints
  () => (
    <>
      {[
        [55, 70],
        [115, 70],
        [40, 120],
        [100, 120],
        [150, 95],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="0" rx="12" ry="10" fill="#f472b6" />
          <circle cx="-10" cy="-14" r="4" fill="#f472b6" />
          <circle cx="10" cy="-14" r="4" fill="#f472b6" />
          <circle cx="-14" cy="-4" r="3" fill="#f472b6" />
          <circle cx="14" cy="-4" r="3" fill="#f472b6" />
        </g>
      ))}
    </>
  ),
  // 13. Dog treat
  () => (
    <g transform="translate(100 100) rotate(-20)">
      <path
        d="M -30 -10 Q -40 -4 -30 4 Q -36 14 -24 14 L 24 14 Q 36 14 30 4 Q 40 -4 30 -10 Q 36 -20 24 -20 L -24 -20 Q -36 -20 -30 -10 Z"
        fill="#fbbf24"
      />
    </g>
  ),
  // 14. Dog with collar
  () => (
    <g transform="translate(100 100)">
      <ellipse cx="0" cy="8" rx="32" ry="28" fill="#fef3c7" />
      <circle cx="-10" cy="0" r="3" fill="#1f2937" />
      <circle cx="10" cy="0" r="3" fill="#1f2937" />
      <ellipse cx="0" cy="12" rx="5" ry="4" fill="#1f2937" />
      <rect x="-34" y="30" width="68" height="8" rx="4" fill="#ec4899" />
      <circle cx="0" cy="34" r="6" fill="#fbbf24" />
    </g>
  ),
  // 15. Panda face
  () => (
    <g transform="translate(100 100)">
      <circle cx="-24" cy="-24" r="12" fill="#111827" />
      <circle cx="24" cy="-24" r="12" fill="#111827" />
      <circle cx="0" cy="4" r="34" fill="#ffffff" />
      <ellipse cx="-14" cy="0" rx="8" ry="10" fill="#111827" />
      <ellipse cx="14" cy="0" rx="8" ry="10" fill="#111827" />
      <circle cx="-14" cy="-2" r="3" fill="#fff" />
      <circle cx="14" cy="-2" r="3" fill="#fff" />
      <ellipse cx="0" cy="10" rx="4" ry="3" fill="#111827" />
      <path d="M -8 18 Q 0 24 8 18" stroke="#111827" strokeWidth="2" fill="none" />
    </g>
  ),
  // 16. Panda hug
  () => (
    <g transform="translate(100 100)">
      <ellipse cx="0" cy="10" rx="36" ry="26" fill="#fff" />
      <ellipse cx="-20" cy="28" rx="10" ry="14" fill="#111827" />
      <ellipse cx="20" cy="28" rx="10" ry="14" fill="#111827" />
      <circle cx="-22" cy="-18" r="10" fill="#111827" />
      <circle cx="22" cy="-18" r="10" fill="#111827" />
      <circle cx="0" cy="-6" r="18" fill="#fff" />
      <circle cx="-6" cy="-8" r="2" fill="#111827" />
      <circle cx="6" cy="-8" r="2" fill="#111827" />
      <ellipse cx="0" cy="-2" rx="3" ry="2" fill="#111827" />
    </g>
  ),
  // 17. Panda in bamboo
  () => (
    <>
      <rect x="160" y="20" width="8" height="160" rx="3" fill="#65a30d" />
      <rect x="145" y="70" width="30" height="6" rx="3" fill="#86efac" />
      <g transform="translate(90 100)">
        <circle cx="-20" cy="-20" r="10" fill="#111827" />
        <circle cx="20" cy="-20" r="10" fill="#111827" />
        <circle cx="0" cy="4" r="28" fill="#fff" />
        <ellipse cx="-10" cy="0" rx="6" ry="8" fill="#111827" />
        <ellipse cx="10" cy="0" rx="6" ry="8" fill="#111827" />
        <ellipse cx="0" cy="8" rx="3" ry="2" fill="#111827" />
      </g>
    </>
  ),
  // 18. Teddy bear
  () => (
    <g transform="translate(100 100)">
      <circle cx="-22" cy="-22" r="10" fill="#a16207" />
      <circle cx="22" cy="-22" r="10" fill="#a16207" />
      <circle cx="-22" cy="-22" r="5" fill="#fde68a" />
      <circle cx="22" cy="-22" r="5" fill="#fde68a" />
      <ellipse cx="0" cy="4" rx="32" ry="28" fill="#a16207" />
      <ellipse cx="0" cy="12" rx="18" ry="14" fill="#fde68a" />
      <circle cx="-10" cy="-4" r="3" fill="#111827" />
      <circle cx="10" cy="-4" r="3" fill="#111827" />
      <ellipse cx="0" cy="8" rx="3" ry="2" fill="#111827" />
      <path d="M -4 14 Q 0 18 4 14" stroke="#111827" strokeWidth="1.5" fill="none" />
    </g>
  ),
  // 19. Polar bear
  () => (
    <g transform="translate(100 100)">
      <circle cx="-22" cy="-22" r="10" fill="#e5e7eb" />
      <circle cx="22" cy="-22" r="10" fill="#e5e7eb" />
      <ellipse cx="0" cy="4" rx="32" ry="28" fill="#f9fafb" />
      <circle cx="-10" cy="-4" r="3" fill="#1f2937" />
      <circle cx="10" cy="-4" r="3" fill="#1f2937" />
      <ellipse cx="0" cy="8" rx="4" ry="3" fill="#1f2937" />
    </g>
  ),
  // 20. Bear with honey pot
  () => (
    <>
      <g transform="translate(80 90)">
        <circle cx="-18" cy="-18" r="8" fill="#92400e" />
        <circle cx="18" cy="-18" r="8" fill="#92400e" />
        <ellipse cx="0" cy="4" rx="26" ry="22" fill="#b45309" />
        <circle cx="-8" cy="-4" r="2" fill="#111827" />
        <circle cx="8" cy="-4" r="2" fill="#111827" />
      </g>
      <g transform="translate(140 130)">
        <path
          d="M -20 -14 L -18 14 Q 0 22 18 14 L 20 -14 Q 0 -22 -20 -14 Z"
          fill="#fbbf24"
        />
        <rect x="-22" y="-18" width="44" height="8" rx="2" fill="#d97706" />
      </g>
    </>
  ),
  // 21. Koala
  () => (
    <g transform="translate(100 100)">
      <circle cx="-28" cy="-20" r="14" fill="#a8a29e" />
      <circle cx="28" cy="-20" r="14" fill="#a8a29e" />
      <circle cx="-28" cy="-20" r="8" fill="#fce7f3" />
      <circle cx="28" cy="-20" r="8" fill="#fce7f3" />
      <ellipse cx="0" cy="6" rx="30" ry="26" fill="#d6d3d1" />
      <ellipse cx="0" cy="8" rx="14" ry="10" fill="#57534e" />
      <circle cx="-10" cy="-4" r="3" fill="#111827" />
      <circle cx="10" cy="-4" r="3" fill="#111827" />
    </g>
  ),
  // 22. Bear with bow
  () => (
    <g transform="translate(100 100)">
      <ellipse cx="0" cy="4" rx="30" ry="26" fill="#d97706" />
      <circle cx="-10" cy="-4" r="3" fill="#111827" />
      <circle cx="10" cy="-4" r="3" fill="#111827" />
      <ellipse cx="0" cy="8" rx="3" ry="2" fill="#111827" />
      <g transform="translate(18 -26) rotate(-12)">
        <path
          d="M -10 0 L 0 -6 L 0 6 Z M 10 0 L 0 -6 L 0 6 Z"
          fill="url(#cute-pink)"
        />
        <circle cx="0" cy="0" r="3" fill="#ec4899" />
      </g>
    </g>
  ),
  // 23. Kitten
  () => (
    <g transform="translate(100 100)">
      <path d="M -32 -14 L -22 -34 L -12 -18 Z" fill="#fb923c" />
      <path d="M 32 -14 L 22 -34 L 12 -18 Z" fill="#fb923c" />
      <ellipse cx="0" cy="4" rx="30" ry="26" fill="#fbbf24" />
      <circle cx="-10" cy="-2" r="3" fill="#1f2937" />
      <circle cx="10" cy="-2" r="3" fill="#1f2937" />
      <path d="M -2 8 L 2 8 L 0 12 Z" fill="#ec4899" />
      <path d="M 0 12 Q -6 16 -14 12" stroke="#1f2937" strokeWidth="1.5" fill="none" />
      <path d="M 0 12 Q 6 16 14 12" stroke="#1f2937" strokeWidth="1.5" fill="none" />
    </g>
  ),
  // 24. Bunny
  () => (
    <g transform="translate(100 100)">
      <ellipse cx="-10" cy="-32" rx="6" ry="18" fill="#fff" />
      <ellipse cx="10" cy="-32" rx="6" ry="18" fill="#fff" />
      <ellipse cx="-10" cy="-32" rx="3" ry="12" fill="#fbcfe8" />
      <ellipse cx="10" cy="-32" rx="3" ry="12" fill="#fbcfe8" />
      <circle cx="0" cy="6" r="26" fill="#fff" />
      <circle cx="-9" cy="0" r="3" fill="#1f2937" />
      <circle cx="9" cy="0" r="3" fill="#1f2937" />
      <circle cx="0" cy="10" r="3" fill="#ec4899" />
    </g>
  ),
  // 25. Hamster
  () => (
    <g transform="translate(100 100)">
      <ellipse cx="0" cy="4" rx="30" ry="24" fill="#fde68a" />
      <ellipse cx="-16" cy="8" rx="8" ry="6" fill="#fcd34d" />
      <ellipse cx="16" cy="8" rx="8" ry="6" fill="#fcd34d" />
      <circle cx="-8" cy="-4" r="3" fill="#1f2937" />
      <circle cx="8" cy="-4" r="3" fill="#1f2937" />
      <circle cx="0" cy="2" r="2" fill="#1f2937" />
    </g>
  ),
  // 26. Lipstick
  () => (
    <g transform="translate(100 100) rotate(-18)">
      <rect x="-10" y="-10" width="20" height="50" rx="3" fill="#111827" />
      <rect x="-12" y="-22" width="24" height="16" rx="2" fill="#fbbf24" />
      <path
        d="M -8 -22 L -2 -44 L 8 -22 Z"
        fill="url(#cute-rose)"
      />
    </g>
  ),
  // 27. Nail polish bottle
  () => (
    <g transform="translate(100 100)">
      <rect x="-18" y="-10" width="36" height="40" rx="4" fill="url(#cute-pink)" />
      <rect x="-10" y="-24" width="20" height="16" rx="3" fill="#111827" />
      <ellipse cx="0" cy="6" rx="12" ry="6" fill="#fff" opacity="0.3" />
    </g>
  ),
  // 28. Perfume bottle
  () => (
    <g transform="translate(100 100)">
      <rect x="-20" y="-8" width="40" height="40" rx="5" fill="#fbcfe8" />
      <rect x="-10" y="-20" width="20" height="14" rx="2" fill="#f9a8d4" />
      <rect x="-4" y="-26" width="8" height="8" rx="2" fill="#fde68a" />
      <Sparkle x={-28} y={-20} s={0.5} />
      <Sparkle x={30} y={-10} s={0.5} />
    </g>
  ),
  // 29. High-heel shoe
  () => (
    <g transform="translate(100 108)">
      <path
        d="M -38 0 Q -30 -18 0 -14 Q 20 -10 28 0 Q 36 10 36 12 L 30 12 Q 8 8 -30 10 Z"
        fill="url(#cute-rose)"
      />
      <rect x="28" y="12" width="6" height="22" fill="url(#cute-rose)" />
    </g>
  ),
  // 30. Handbag
  () => (
    <g transform="translate(100 100)">
      <path d="M -20 -14 Q -20 -34 0 -34 Q 20 -34 20 -14" stroke="#a16207" strokeWidth="3" fill="none" />
      <rect x="-28" y="-14" width="56" height="40" rx="5" fill="url(#cute-rose)" />
      <rect x="-4" y="4" width="8" height="6" rx="1" fill="#fde68a" />
    </g>
  ),
  // 31. Makeup mirror
  () => (
    <g transform="translate(100 100)">
      <circle cx="0" cy="-6" r="30" fill="#f9a8d4" />
      <circle cx="0" cy="-6" r="24" fill="#fbcfe8" />
      <path d="M -4 24 L 4 24 L 8 42 L -8 42 Z" fill="#f9a8d4" />
      <rect x="-16" y="42" width="32" height="6" rx="2" fill="#ec4899" />
      <Sparkle x={-14} y={-20} s={0.5} />
    </g>
  ),
  // 32. Bow ribbon
  () => (
    <g transform="translate(100 100)">
      <path d="M -30 -14 L 0 0 L 0 -14 Z" fill="url(#cute-pink)" />
      <path d="M -30 14 L 0 0 L 0 14 Z" fill="url(#cute-pink)" />
      <path d="M 30 -14 L 0 0 L 0 -14 Z" fill="url(#cute-pink)" />
      <path d="M 30 14 L 0 0 L 0 14 Z" fill="url(#cute-pink)" />
      <circle cx="0" cy="0" r="6" fill="#ec4899" />
    </g>
  ),
  // 33. Dress on hanger
  () => (
    <g transform="translate(100 100)">
      <path d="M 0 -32 Q -4 -28 0 -24 Q 4 -28 0 -32 Z" fill="none" stroke="#9ca3af" strokeWidth="2" />
      <rect x="-30" y="-22" width="60" height="4" rx="1" fill="#9ca3af" />
      <path
        d="M -26 -18 L 26 -18 L 34 30 L -34 30 Z"
        fill="url(#cute-pink)"
      />
      <circle cx="0" cy="-12" r="3" fill="#fde68a" />
    </g>
  ),
  // 34. Crown
  () => (
    <g transform="translate(100 108)">
      <path
        d="M -40 -10 L -30 20 L 30 20 L 40 -10 L 24 4 L 16 -16 L 0 8 L -16 -16 L -24 4 Z"
        fill="url(#cute-butter)"
      />
      <rect x="-38" y="18" width="76" height="8" rx="2" fill="#fbbf24" />
      <circle cx="-24" cy="4" r="4" fill="#ec4899" />
      <circle cx="0" cy="8" r="4" fill="#ec4899" />
      <circle cx="24" cy="4" r="4" fill="#ec4899" />
    </g>
  ),
  // 35. Diamond ring
  () => (
    <g transform="translate(100 100)">
      <ellipse cx="0" cy="14" rx="22" ry="20" fill="none" stroke="#fde68a" strokeWidth="6" />
      <path
        d="M 0 -24 L -12 -10 L 0 4 L 12 -10 Z"
        fill="#a5f3fc"
      />
      <path d="M -12 -10 L 0 -10 L 0 -24 Z" fill="#ecfeff" opacity="0.8" />
    </g>
  ),
  // 36. Unicorn silhouette
  () => (
    <g transform="translate(100 100)">
      <path
        d="M -30 10 Q -28 -14 -10 -20 Q 14 -24 24 -6 Q 32 20 10 26 Q -22 30 -30 10 Z"
        fill="#fff"
      />
      <path d="M -4 -22 L 2 -38 L 10 -22 Z" fill="url(#cute-rose)" />
      <path d="M -18 -18 Q -10 -36 2 -28" fill="none" stroke="url(#cute-pink)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="18" cy="-2" r="2" fill="#111827" />
    </g>
  ),
  // 37. Rainbow arc
  () => (
    <g transform="translate(100 120)">
      {[
        ["#ef4444", 56],
        ["#f59e0b", 50],
        ["#fbbf24", 44],
        ["#4ade80", 38],
        ["#38bdf8", 32],
        ["#a78bfa", 26],
      ].map(([c, r], i) => (
        <path
          key={i}
          d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
          stroke={c as string}
          strokeWidth="6"
          fill="none"
        />
      ))}
      <ellipse cx="-60" cy="0" rx="16" ry="8" fill="#f9fafb" />
      <ellipse cx="60" cy="0" rx="16" ry="8" fill="#f9fafb" />
    </g>
  ),
  // 38. Star
  () => (
    <g transform="translate(100 100)">
      <path
        d="M 0 -40 L 12 -12 L 42 -10 L 18 8 L 26 38 L 0 22 L -26 38 L -18 8 L -42 -10 L -12 -12 Z"
        fill="url(#cute-butter)"
      />
    </g>
  ),
  // 39. Sparkles cluster
  () => (
    <>
      <Sparkle x={50} y={40} />
      <Sparkle x={100} y={80} s={1.4} />
      <Sparkle x={160} y={60} s={0.7} />
      <Sparkle x={40} y={150} s={0.9} />
      <Sparkle x={150} y={140} s={1.1} />
    </>
  ),
  // 40. Shooting star
  () => (
    <g transform="translate(100 100)">
      <path
        d="M 20 -20 L -30 30"
        stroke="url(#cute-violet)"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M 30 -30 L 48 -24 L 42 -8 L 26 -10 L 22 -28 Z"
        fill="url(#cute-butter)"
      />
    </g>
  ),
  // 41. Heart cluster
  () => (
    <>
      <Heart x={80} y={80} s={2.2} fill="url(#cute-rose)" />
      <Heart x={130} y={60} s={1.4} fill="#f472b6" />
      <Heart x={50} y={130} s={1.2} fill="#fda4af" />
      <Heart x={150} y={150} s={1.6} fill="url(#cute-pink)" />
    </>
  ),
  // 42. Cupcake
  () => (
    <g transform="translate(100 110)">
      <path d="M -26 10 L -20 36 L 20 36 L 26 10 Z" fill="url(#cute-peach)" />
      <path
        d="M -28 10 Q -34 -6 -16 -8 Q -20 -22 0 -22 Q 20 -22 16 -8 Q 34 -6 28 10 Z"
        fill="url(#cute-pink)"
      />
      <circle cx="0" cy="-20" r="4" fill="#fde68a" />
    </g>
  ),
  // 43. Ice cream cone
  () => (
    <g transform="translate(100 100)">
      <path d="M -16 0 L 16 0 L 0 40 Z" fill="url(#cute-peach)" />
      <path
        d="M -16 -4 Q -20 -24 0 -24 Q 20 -24 16 -4 Q 14 6 -14 4 Z"
        fill="url(#cute-pink)"
      />
      <circle cx="-6" cy="-18" r="6" fill="#fbcfe8" />
      <circle cx="6" cy="-18" r="6" fill="#f472b6" />
      <circle cx="0" cy="-26" r="4" fill="#fef3c7" />
    </g>
  ),
  // 44. Donut
  () => (
    <g transform="translate(100 100)">
      <circle cx="0" cy="0" r="30" fill="url(#cute-pink)" />
      <circle cx="0" cy="0" r="10" fill="#f9fafb" />
      {[
        [-14, -20, "#a78bfa"],
        [18, -14, "#fde68a"],
        [22, 14, "#4ade80"],
        [-18, 18, "#f472b6"],
        [0, -26, "#38bdf8"],
      ].map(([x, y, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r="2" fill={c as string} />
      ))}
    </g>
  ),
  // 45. Lollipop
  () => (
    <g transform="translate(100 100)">
      <rect x="-2" y="0" width="4" height="44" fill="#d1d5db" />
      <circle cx="0" cy="0" r="24" fill="url(#cute-rose)" />
      <path
        d="M 0 -20 Q 18 -8 8 14 Q -14 18 -20 0 Q -14 -18 0 -20 Z"
        fill="#fbcfe8"
        opacity="0.6"
      />
    </g>
  ),
  // 46. Strawberry
  () => (
    <g transform="translate(100 104)">
      <path d="M -20 -6 Q 0 -36 20 -6 Q 14 30 0 30 Q -14 30 -20 -6 Z" fill="#ef4444" />
      <path d="M -18 -14 L -8 -24 L 0 -18 L 8 -24 L 18 -14 L 8 -8 L 0 -14 L -8 -8 Z" fill="#4ade80" />
      {[
        [-10, 0],
        [6, 4],
        [-4, 10],
        [10, 14],
        [-8, 18],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#fde68a" />
      ))}
    </g>
  ),
  // 47. Cherry pair
  () => (
    <g transform="translate(100 100)">
      <path d="M -8 -20 Q 0 -40 20 -28" stroke="#65a30d" strokeWidth="3" fill="none" />
      <path d="M 12 -20 Q 20 -36 30 -28" stroke="#65a30d" strokeWidth="3" fill="none" />
      <circle cx="-10" cy="10" r="14" fill="url(#cute-rose)" />
      <circle cx="14" cy="16" r="14" fill="#dc2626" />
      <ellipse cx="-14" cy="6" rx="4" ry="2" fill="#fff" opacity="0.5" />
    </g>
  ),
  // 48. Boba tea
  () => (
    <g transform="translate(100 100)">
      <rect x="-20" y="-28" width="40" height="56" rx="4" fill="#fde68a" opacity="0.8" />
      <rect x="-22" y="-30" width="44" height="6" rx="2" fill="#fde68a" />
      <rect x="-4" y="-42" width="8" height="24" fill="#fcd34d" />
      {[
        [-8, 12],
        [6, 14],
        [0, 22],
        [-10, 20],
        [8, 6],
        [-2, 6],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#111827" />
      ))}
    </g>
  ),
  // 49. Cute cake
  () => (
    <g transform="translate(100 100)">
      <rect x="-30" y="0" width="60" height="30" rx="4" fill="url(#cute-pink)" />
      <path
        d="M -30 0 Q -30 -14 0 -14 Q 30 -14 30 0 Z"
        fill="#fff"
      />
      <path d="M 0 -14 L -4 -30 L 4 -30 Z" fill="#fbbf24" />
      <circle cx="0" cy="-32" r="4" fill="#fde68a" />
      {[[-18, 8], [0, 14], [18, 8]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#f472b6" />
      ))}
    </g>
  ),
  // 50. Gift box
  () => (
    <g transform="translate(100 100)">
      <rect x="-30" y="-4" width="60" height="40" rx="3" fill="url(#cute-rose)" />
      <rect x="-30" y="-16" width="60" height="16" rx="3" fill="url(#cute-pink)" />
      <rect x="-4" y="-16" width="8" height="52" fill="#fbbf24" />
      <path
        d="M -20 -20 Q -14 -36 0 -20 Q 14 -36 20 -20"
        stroke="#fbbf24"
        strokeWidth="4"
        fill="none"
      />
    </g>
  ),
];

export const CUTE_ARTS_COUNT = ARTS.length;

export function pickCuteArtIndex(seed: number): number {
  if (ARTS.length === 0) return 0;
  return Math.abs(Math.floor(seed)) % ARTS.length;
}

/**
 * Render one of the 50 cute scenes. `size` drives the outer viewBox
 * (200×200 coords). A soft radial halo sits behind every scene so
 * the art reads over any hero gradient.
 */
export function CuteArtBadge({
  seed,
  size = 160,
  className = "",
}: {
  seed: number;
  size?: number;
  className?: string;
}) {
  const idx = pickCuteArtIndex(seed);
  const Scene = ARTS[idx];
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      style={{ pointerEvents: "none" }}
    >
      <defs>{GRADIENTS}</defs>
      <circle cx="100" cy="100" r="96" fill="url(#cute-glow)" />
      {Scene ? <Scene /> : null}
    </svg>
  );
}
