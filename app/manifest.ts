import type { MetadataRoute } from "next";

/**
 * PWA manifest — mostly an SEO + Lighthouse signal. Installing to
 * the home screen produces a branded launcher and lets Chrome show
 * the "install app" prompt on eligible visits.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amazing School",
    short_name: "Amazing School",
    description: "Learn English with AI · Aprenda inglês com IA",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#6366f1",
    categories: ["education", "productivity"],
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      // Square 1000×1000 smiley logo — Next.js auto-generates link
      // tags for app/icon.png and app/apple-icon.png; we mirror the
      // same files here so installed PWAs pick up the same brand mark.
      {
        src: "/icon.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
