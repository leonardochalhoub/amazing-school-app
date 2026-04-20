import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta grátis · Sign up free",
  description:
    "Comece a aprender inglês com IA grátis. Lições CEFR, tutor 24/7, pronunciation lab — sem cartão de crédito, sem pegadinha.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Criar conta grátis — Amazing School",
    description:
      "Comece a aprender inglês com IA. Grátis, sem cartão, open-source.",
    url: "/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
