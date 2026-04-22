import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { YearSelector } from "@/components/reports/year-selector";
import { T } from "@/components/reports/t";
import { availableYears } from "@/lib/reports/period";

interface Props {
  teacherId: string;
  /** Seed dates used to populate the year selector. Typically the
   *  teacher's profile created_at + any live-class event_date + any
   *  self-assignment assigned_at. Falsy values are ignored. */
  seedDates: Array<string | null | undefined>;
}

/**
 * Mirror of MyDocumentsCard for teachers. One section — "Currículo
 * PDF" — with a year selector and a Download button that opens
 * /print/teacher/[id]/curriculum. Matches the visual layout used
 * on the student profile (same CardHeader, same period copy).
 */
export function TeacherDocumentsCard({ teacherId, seedDates }: Props) {
  const years = availableYears(seedDates);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          <T en="Documents" pt="Documentos" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">
              <T en="Curriculum PDF" pt="Currículo em PDF" />
            </p>
            <p className="text-[11px] text-muted-foreground">
              <T
                en="Pick the period and generate the report with the school logo."
                pt="Escolha o período e gere o relatório com o logo da escola."
              />
            </p>
          </div>
          <YearSelector
            years={years}
            hrefTemplate={`/print/teacher/${teacherId}/curriculum?year={year}&autoprint=1`}
            labelEn="Download curriculum"
            labelPt="Baixar currículo"
          />
        </div>
      </CardContent>
    </Card>
  );
}
