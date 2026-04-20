import type { Metadata } from "next";
import { LandingClient } from "@/components/landing/landing-client";

// Landing-page metadata overrides the root defaults so the home
// page shows up in SERPs and social shares with a tailored hook.
// Primary audience is Brazilian → pt-BR copy leads; English tagline
// rides along so LinkedIn / X shares read well in both.
export const metadata: Metadata = {
  title:
    "Amazing School — Inglês com IA para brasileiros · Free English learning with AI",
  description:
    "Plataforma gratuita de inglês: lições CEFR (A1-B2), tutor de IA, laboratório de pronúncia com pontuação Whisper, gamificação e painel para professores. Livre e open-source.",
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
      en: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "Amazing School — Inglês com IA para brasileiros",
    description:
      "Gratuito, open-source. Lições CEFR, tutor de IA, speaking lab, sala de aula para professores.",
    url: "/",
    type: "website",
  },
  twitter: {
    title: "Amazing School — Inglês com IA para brasileiros",
    description:
      "Gratuito, open-source. Lições CEFR, tutor de IA, speaking lab, sala de aula para professores.",
  },
};

export default function HomePage() {
  return <LandingClient />;
}
