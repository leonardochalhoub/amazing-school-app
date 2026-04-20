import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aprenda inglês com música · English through music",
  description:
    "Aprenda inglês com músicas reais — letras clicáveis, exercícios alinhados à letra, dicionário integrado. Beyoncé, U2, Oasis, Guns N' Roses e mais.",
  alternates: { canonical: "/demo/music" },
  openGraph: {
    title: "Aprenda inglês com música — Amazing School",
    description:
      "Letras clicáveis, exercícios, dicionário. Beyoncé, U2, Oasis e mais.",
    url: "/demo/music",
  },
};

export default function MusicDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
