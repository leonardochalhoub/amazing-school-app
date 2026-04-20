import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { T } from "@/components/reports/t";

interface CefrRow {
  code: string;
  labelEn: string;
  labelPt: string;
  en: string;
  pt: string;
}

const ROWS: CefrRow[] = [
  {
    code: "A1",
    labelEn: "Beginner",
    labelPt: "Básico",
    en: "Understands and uses everyday expressions, introduces oneself, and answers simple personal questions.",
    pt: "Entende e usa frases do dia a dia, apresenta-se e responde a perguntas pessoais simples.",
  },
  {
    code: "A2",
    labelEn: "Pre-Intermediate",
    labelPt: "Pré-Intermediário",
    en: "Handles routine tasks and describes background and immediate environment.",
    pt: "Comunica-se em tarefas rotineiras e descreve aspectos do seu passado e ambiente imediato.",
  },
  {
    code: "B1",
    labelEn: "Intermediate",
    labelPt: "Intermediário",
    en: "Deals with most travel situations and writes simple texts on familiar topics.",
    pt: "Lida com a maioria das situações em viagem e escreve textos simples sobre temas familiares.",
  },
  {
    code: "B2",
    labelEn: "Upper-Intermediate",
    labelPt: "Intermediário Superior",
    en: "Speaks with fluency and understands complex texts on concrete and abstract topics.",
    pt: "Conversa com fluência e entende textos complexos sobre temas concretos e abstratos.",
  },
  {
    code: "C1",
    labelEn: "Advanced",
    labelPt: "Avançado",
    en: "Uses the language flexibly and effectively for social, academic, and professional purposes.",
    pt: "Usa a língua com flexibilidade e eficácia em fins sociais, acadêmicos e profissionais.",
  },
  {
    code: "C2",
    labelEn: "Proficient",
    labelPt: "Proficiente",
    en: "Understands virtually everything heard or read and expresses themselves with native-like ease.",
    pt: "Compreende praticamente tudo o que ouve ou lê e expressa-se com naturalidade nativa.",
  },
];

export function CefrExplainerCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookMarked className="h-4 w-4 text-primary" />
          <T en="CEFR level scale" pt="Escala de níveis · CEFR" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          <T
            en={
              "The Common European Framework of Reference for Languages is the international standard adopted by Cambridge, British Council, and the leading language schools to measure English proficiency. Certificates issued here follow exactly this scale."
            }
            pt={
              "O Common European Framework of Reference for Languages (Quadro Europeu Comum de Referência para Línguas) é o padrão internacional adotado por Cambridge, British Council e pelas principais escolas para medir a proficiência em inglês. Os certificados emitidos aqui seguem exatamente essa escala."
            }
          />
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
                <p className="font-semibold">
                  <T en={row.labelEn} pt={row.labelPt} />
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <T en={row.en} pt={row.pt} />
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-muted-foreground">
          <T
            en={
              <>
                Each level can be split into two semesters (e.g.{" "}
                <span className="font-semibold">B1.1</span> and{" "}
                <span className="font-semibold">B1.2</span>) — your teacher
                picks the slice that fits the class best.
              </>
            }
            pt={
              <>
                Cada nível pode ser dividido em dois semestres (ex.:{" "}
                <span className="font-semibold">B1.1</span> e{" "}
                <span className="font-semibold">B1.2</span>) — o seu
                professor define o recorte que melhor se encaixa na turma.
              </>
            }
          />
        </p>
      </CardContent>
    </Card>
  );
}
