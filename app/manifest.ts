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
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
