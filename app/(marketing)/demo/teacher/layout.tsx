import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo do professor · Teacher demo",
  description:
    "Explore o painel do professor da Amazing School com dados fictícios de demonstração: turmas, alunos, XP, matriz de mensalidades, agendamentos e diário — sem cadastro, nada real é afetado.",
  alternates: { canonical: "/demo/teacher" },
  openGraph: {
    title: "Veja o painel do professor — Amazing School",
    description:
      "Painel de demonstração com dados fictícios: turmas, alunos, matriz de mensalidades, agenda. Sem cadastro. Nenhum dado real é afetado.",
    url: "/demo/teacher",
  },
};

export default function TeacherDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
