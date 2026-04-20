import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMarked } from "lucide-react";

interface CefrRow {
  code: string;
  label: string;
  description: string;
}

const ROWS: CefrRow[] = [
  {
    code: "A1",
    label: "Básico",
    description:
      "Entende e usa frases do dia a dia, apresenta-se e responde a perguntas pessoais simples.",
  },
  {
    code: "A2",
    label: "Pré-Intermediário",
    description:
      "Comunica-se em tarefas rotineiras e descreve aspectos do seu passado e ambiente imediato.",
  },
  {
    code: "B1",
    label: "Intermediário",
    description:
      "Lida com a maioria das situações em viagem e escreve textos simples sobre temas familiares.",
  },
  {
    code: "B2",
    label: "Intermediário Superior",
    description:
      "Conversa com fluência e entende textos complexos sobre temas concretos e abstratos.",
  },
  {
    code: "C1",
    label: "Avançado",
    description:
      "Usa a língua com flexibilidade e eficácia em fins sociais, acadêmicos e profissionais.",
  },
  {
    code: "C2",
    label: "Proficiente",
    description:
      "Compreende praticamente tudo o que ouve ou lê e expressa-se com naturalidade nativa.",
  },
];

/**
 * Explainer card shown on both teacher and student profile pages so
 * everyone understands what the CEFR-aligned certificates mean. The
 * same scale drives certificate levels, roster levels, and lesson
 * difficulty tags across the app.
 */
export function CefrExplainerCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookMarked className="h-4 w-4 text-primary" />
          Escala de níveis · CEFR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          O{" "}
          <span className="font-semibold">
            Common European Framework of Reference for Languages
          </span>{" "}
          (Quadro Europeu Comum de Referência para Línguas) é o padrão
          internacional adotado por Cambridge, British Council e pelas
          principais escolas para medir a proficiência em inglês. Os
          certificados emitidos aqui seguem exatamente essa escala.
        </p>

        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {ROWS.map((row) => (
            <li
              key={row.code}
              className="flex items-start gap-3 px-3 py-2.5 text-xs"
            >
              <span className="inline-flex h-7 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold uppercase tracking-wider text-primary">
                {row.code}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{row.label}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {row.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-muted-foreground">
          Cada nível pode ser dividido em dois semestres (ex.:{" "}
          <span className="font-semibold">B1.1</span> e{" "}
          <span className="font-semibold">B1.2</span>) — o seu
          professor define o recorte que melhor se encaixa na turma.
        </p>
      </CardContent>
    </Card>
  );
}
