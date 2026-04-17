export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`group/brand relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 text-white shadow-lg ring-1 ring-black/10 transition-all duration-500 hover:brightness-110 hover:saturate-150 hover:shadow-xl dark:ring-white/10 ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[64%] w-[64%] transition-transform duration-500 group-hover/brand:scale-[1.06]"
        aria-hidden
      >
        {/* Eyes — two soft dots that squint happier on hover */}
        <circle
          cx="12"
          cy="13"
          r="1.5"
          fill="currentColor"
          stroke="none"
          className="transition-transform duration-300 origin-center group-hover/brand:translate-y-[0.5px]"
        />
        <circle
          cx="20"
          cy="13"
          r="1.5"
          fill="currentColor"
          stroke="none"
          className="transition-transform duration-300 origin-center group-hover/brand:translate-y-[0.5px]"
        />
        {/* Resting smile — fades out on hover */}
        <path
          d="M10 19 Q16 24.5 22 19"
          className="transition-opacity duration-300 group-hover/brand:opacity-0"
        />
        {/* Beaming smile — appears on hover (wider + deeper curve) */}
        <path
          d="M9 18.5 Q16 27 23 18.5"
          className="opacity-0 transition-opacity duration-300 group-hover/brand:opacity-100"
        />
        {/* Sparkle above the eye — twinkles on hover */}
        <path
          d="M23.5 7 L24 8.5 L25.5 9 L24 9.5 L23.5 11 L23 9.5 L21.5 9 L23 8.5 Z"
          fill="currentColor"
          stroke="none"
          className="origin-center transition-transform duration-500 group-hover/brand:rotate-[25deg] group-hover/brand:scale-125"
        />
      </svg>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/15"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-1 -top-1 h-1/2 w-1/2 rounded-full bg-white/20 blur-lg transition-opacity duration-500 group-hover/brand:bg-white/40 group-hover/brand:blur-2xl"
      />
    </span>
  );
}
