import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo do professor · Teacher demo",
  description:
    "Explore o painel do professor da Amazing School com dados reais simulados: turmas, alunos, XP, matriz de mensalidades, agendamentos e diário — sem cadastro.",
  alternates: { canonical: "/demo/teacher" },
  openGraph: {
    title: "Veja o painel do professor — Amazing School",
    description:
      "Painel com dados simulados: turmas, alunos, matriz de mensalidades, agenda. Sem cadastro.",
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
