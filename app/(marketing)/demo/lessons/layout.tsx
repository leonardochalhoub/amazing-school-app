import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lições grátis · Free English lessons",
  description:
    "Biblioteca aberta de lições CEFR (A1 até B2): gramática, vocabulário, leitura, escuta. Abra qualquer uma sem criar conta.",
  alternates: { canonical: "/demo/lessons" },
  openGraph: {
    title: "Lições grátis de inglês — Amazing School",
    description:
      "Biblioteca CEFR de A1 a B2. Grátis, sem cadastro, open-source.",
    url: "/demo/lessons",
  },
};

export default function LessonsDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
