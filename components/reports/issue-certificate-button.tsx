"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GraduationCap, Loader2, Info, Plus, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCertificate,
  estimatePlatformMinutes,
} from "@/lib/actions/certificates";
import {
  CERTIFICATE_LEVELS,
  CERTIFICATE_LEVEL_CHOICES,
  GRADE_OPTIONS,
  findCertificateLevel,
} from "@/lib/reports/certificate-levels";
import { formatCpf } from "@/lib/reports/cpf";

interface Props {
  /** Single student — fixed selection, no student picker. */
  rosterStudentId?: string;
  studentName?: string;
  defaultStartOn?: string | null;
  /** Central mode — pass the full roster; the dialog renders a
      student picker at the top so a teacher can issue from
      Management without hopping to a per-student page. */
  students?: Array<{
    id: string;
    fullName: string;
    billingStartsOn?: string | null;
    createdAt?: string | null;
  }>;
  variant?: "default" | "subtle";
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Mode = "cefr" | "custom";

export function IssueCertificateButton({
  rosterStudentId,
  studentName,
  defaultStartOn,
  students,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // In roster mode the caller passes a list of students; the dialog
  // renders a picker at the top and we resolve start-date from the
  // chosen row. In single mode we lock to the roster id we received.
  const isRosterMode = !rosterStudentId && !!students && students.length > 0;
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    rosterStudentId ?? students?.[0]?.id ?? "",
  );

  const [mode, setMode] = useState<Mode>("cefr");
  const [level, setLevel] = useState<string>("b1");
  const [grade, setGrade] = useState<string>("A");
  const [startOn, setStartOn] = useState<string>(() => {
    const picked =
      students?.find((s) => s.id === selectedStudentId) ?? null;
    return (
      picked?.billingStartsOn?.slice(0, 10) ??
      picked?.createdAt?.slice(0, 10) ??
      defaultStartOn?.slice(0, 10) ??
      todayISO()
    );
  });
  const [endOn, setEndOn] = useState<string>(todayISO());
  const [issuedOn, setIssuedOn] = useState<string>(todayISO());
  const [title, setTitle] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [totalHours, setTotalHours] = useState<string>("");
  const [teacherCredentials, setTeacherCredentials] = useState<string>("");
  const [teacherCpf, setTeacherCpf] = useState<string>("");
  const [platformMinutes, setPlatformMinutes] = useState<number | null>(null);

  // Pull the platform-estimated minutes whenever the dialog opens
  // for a given student. Shown as a hint next to the Hours field.
  useEffect(() => {
    if (!open) return;
    const targetId = rosterStudentId ?? selectedStudentId;
    if (!targetId) return;
    let cancelled = false;
    estimatePlatformMinutes(targetId).then((m) => {
      if (!cancelled) setPlatformMinutes(m);
    });
    return () => {
      cancelled = true;
    };
  }, [open, rosterStudentId, selectedStudentId]);

  const platformHoursLabel =
    platformMinutes == null
      ? null
      : `${Math.floor(platformMinutes / 60)}h ${platformMinutes % 60}min`;

  const cefrChoices = CERTIFICATE_LEVEL_CHOICES.map(
    (c) => CERTIFICATE_LEVELS.find((l) => l.code === c)!,
  );

  function onPickStudent(id: string) {
    setSelectedStudentId(id);
    const picked = students?.find((s) => s.id === id);
    const nextStart =
      picked?.billingStartsOn?.slice(0, 10) ??
      picked?.createdAt?.slice(0, 10) ??
      todayISO();
    setStartOn(nextStart);
  }

  function submit() {
    const targetRosterId = rosterStudentId ?? selectedStudentId;
    if (!targetRosterId) {
      toast.error("Selecione um aluno");
      return;
    }
    const hoursNum = totalHours.trim() ? Number(totalHours) : null;
    if (hoursNum !== null && (!Number.isFinite(hoursNum) || hoursNum < 0)) {
      toast.error("Horas inválidas");
      return;
    }
    if (mode === "custom" && !title.trim()) {
      toast.error("Informe o título do certificado personalizado");
      return;
    }
    startTransition(async () => {
      const res = await createCertificate({
        rosterStudentId: targetRosterId,
        level: mode === "custom" ? "custom" : level,
        grade,
        courseStartOn: startOn,
        courseEndOn: endOn,
        title,
        remarks,
        totalHours: hoursNum,
        issuedOn,
        teacherTitle: teacherCredentials,
        teacherCpf,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Certificado emitido");
      setOpen(false);
      router.refresh();
    });
  }

  const activeStudentName =
    studentName ??
    students?.find((s) => s.id === selectedStudentId)?.fullName ??
    "—";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={variant === "subtle" ? "outline" : "default"}
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Emitir certificado
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir certificado</DialogTitle>
            <DialogDescription>
              {isRosterMode ? (
                <>Selecione o aluno e emita o certificado.</>
              ) : (
                <>
                  Para{" "}
                  <span className="font-medium">{activeStudentName}</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isRosterMode ? (
              <div className="grid gap-2">
                <Label htmlFor="cert-student">Aluno</Label>
                <select
                  id="cert-student"
                  value={selectedStudentId}
                  onChange={(e) => onPickStudent(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {(students ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Mode toggle */}
            <div
              role="tablist"
              className="grid grid-cols-2 gap-1 rounded-lg border border-border p-0.5 text-xs"
            >
              <button
                role="tab"
                aria-selected={mode === "cefr"}
                onClick={() => setMode("cefr")}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  mode === "cefr"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookMarked className="mr-1.5 inline h-3 w-3" />
                Nível CEFR
              </button>
              <button
                role="tab"
                aria-selected={mode === "custom"}
                onClick={() => setMode("custom")}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  mode === "custom"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="mr-1.5 inline h-3 w-3" />
                Personalizado
              </button>
            </div>

            {mode === "cefr" ? (
              <>
                <div className="flex items-start gap-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-2.5 text-[11px] text-sky-800 dark:text-sky-200">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Curso alinhado ao{" "}
                    <span className="font-semibold">CEFR</span> — A1 a C2,
                    adotado por Cambridge, Cultura Inglesa e demais
                    escolas de referência.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cert-level">Nível concluído</Label>
                  <select
                    id="cert-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {cefrChoices.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.codeLabel} · {l.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    {findCertificateLevel(level)?.en}
                  </p>
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="cert-custom-title">
                  Título do certificado
                </Label>
                <Input
                  id="cert-custom-title"
                  placeholder="Ex.: English for Tech Professionals · 20h"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Texto que aparece no corpo do certificado. Use livremente —
                  cursos temáticos, intensivos, módulos de conversação, etc.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Conceito</Label>
              <div className="grid grid-cols-3 gap-2">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGrade(g.value)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      grade === g.value
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="block font-bold">{g.value}</span>
                    <span className="block text-[11px]">{g.caption}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cert-start">Início do curso</Label>
                <Input
                  id="cert-start"
                  type="date"
                  value={startOn}
                  onChange={(e) => setStartOn(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cert-end">Conclusão</Label>
                <Input
                  id="cert-end"
                  type="date"
                  value={endOn}
                  onChange={(e) => setEndOn(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cert-issued">Data de emissão</Label>
                <Input
                  id="cert-issued"
                  type="date"
                  value={issuedOn}
                  onChange={(e) => setIssuedOn(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cert-hours">
                Carga horária total{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="cert-hours"
                type="number"
                min={0}
                max={10000}
                step={1}
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                placeholder={
                  platformMinutes
                    ? `Ex.: ${Math.round(platformMinutes / 60)}`
                    : "Ex.: 40"
                }
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <p>
                  Inclui aulas ao vivo, lições da plataforma, música e
                  tarefa de casa.
                </p>
                {platformHoursLabel ? (
                  <button
                    type="button"
                    onClick={() =>
                      setTotalHours(
                        String(Math.round((platformMinutes ?? 0) / 60)),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-background/60 px-2 py-0.5 text-[10.5px] font-medium hover:bg-muted"
                    title="Usar como ponto de partida"
                  >
                    Plataforma: <strong>{platformHoursLabel}</strong>
                  </button>
                ) : null}
              </div>
            </div>

            {mode === "cefr" ? (
              <div className="grid gap-2">
                <Label htmlFor="cert-title">
                  Título personalizado{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="cert-title"
                  placeholder="Ex.: Certificado de Conclusão · Intermediário"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="cert-teacher-title">
                Sua titulação{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="cert-teacher-title"
                placeholder="Ex.: Especialista em Letras Português-Inglês pela UFRJ"
                value={teacherCredentials}
                onChange={(e) => setTeacherCredentials(e.target.value)}
                maxLength={200}
              />
              <p className="text-[11px] text-muted-foreground">
                Aparece entre o seu nome e &ldquo;Professor
                Responsável&rdquo; na linha da assinatura. Traduzida
                automaticamente para a versão em inglês.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cert-teacher-cpf">
                Seu CPF{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="cert-teacher-cpf"
                placeholder="000.000.000-00"
                value={teacherCpf}
                onChange={(e) =>
                  // Live mask: whatever the teacher types (bare
                  // digits, partial formatted, full formatted) gets
                  // normalised to the 999.888.777-00 shape so the
                  // stored value is always canonical.
                  setTeacherCpf(formatCpf(e.target.value))
                }
                inputMode="numeric"
                maxLength={14}
              />
              <p className="text-[11px] text-muted-foreground">
                Aparece logo abaixo do seu nome na linha da assinatura
                do certificado, sempre no formato{" "}
                <span className="font-semibold">999.888.777-00</span>.
                Não é obrigatório.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cert-remarks">
                Observações{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="cert-remarks"
                placeholder="Frase de destaque do professor — aparece no rodapé do certificado."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
              )}
              Emitir certificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
