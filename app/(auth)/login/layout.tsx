import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar · Sign in",
  description:
    "Entre na sua conta Amazing School para continuar suas aulas, conversar com o tutor de IA e acompanhar seu progresso.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
