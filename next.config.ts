import type { NextConfig } from "next";

/**
 * Security headers applied to every response. Notes on each choice:
 *
 * - CSP: allows self + inline/eval (Next.js 16 streaming still emits
 *   inline bootstrap scripts), same-origin WebSockets (for Supabase
 *   Realtime if ever enabled), Supabase + Groq + Google Fonts +
 *   YouTube embeds for the music player, and `data:` for the avatar
 *   cartoon SVGs served as data URLs. Everything else blocked.
 * - frame-ancestors 'self': stops the entire app from being iframed
 *   on attacker domains (classic clickjacking).
 * - X-Content-Type-Options: no sniffing — serve the MIME we say.
 * - Referrer-Policy: strict-origin-when-cross-origin — don't leak the
 *   full path + query string to third parties on outbound links.
 * - Permissions-Policy: mic is scoped to `self` so only our own
 *   origin can call getUserMedia (speaking-lab); deny everything else.
 */
const CSP = [
  "default-src 'self'",
  // Next.js still emits inline bootstrap + Tailwind runtime styles.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
  "media-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://api.anthropic.com https://generativelanguage.googleapis.com https://dictionary.cambridge.org https://mymemory.translated.net",
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["sharp"],
  outputFileTracingExcludes: {
    "*": ["./scripts/**/*", "./tests/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "microphone=(self), camera=(), geolocation=(), payment=(), usb=()",
          },
          // frame-ancestors in the CSP covers this, but some older
          // browsers still read this header separately. Belt + braces.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
