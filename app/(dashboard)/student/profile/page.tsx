import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { ChangePasswordCard } from "@/components/shared/change-password-card";
import { LocationCard } from "@/components/shared/location-card";
import { PrivacyNotice } from "@/components/shared/privacy-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowUpRight, Calendar } from "lucide-react";
import { redirect } from "next/navigation";
import { MyDocumentsCard } from "@/components/reports/my-documents-card";
import { CertificatesPanel } from "@/components/reports/certificates-panel";
import { CefrExplainerCard } from "@/components/reports/cefr-explainer-card";
import { getMyRosterIdentity, listMyReceipts } from "@/lib/actions/reports";
import { listMyCertificates } from "@/lib/actions/certificates";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url, location")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const [
    signedUrl,
    rosterSelfRes,
    myRoster,
    myReceipts,
    myCertificates,
  ] = await Promise.all([
    resolveMyAvatarUrl(supabase, user.id),
    admin
      .from("roster_students")
      .select("age_group, gender, billing_starts_on, ended_on, created_at")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    getMyRosterIdentity(),
    listMyReceipts(),
    listMyCertificates(),
  ]);
  const { data: rosterSelf } = rosterSelfRes;
  const studentFullName = profile.full_name;
  const roster = rosterSelf as
    | {
        age_group: "kid" | "teen" | "adult" | null;
        gender: "female" | "male" | null;
        billing_starts_on: string | null;
        ended_on: string | null;
        created_at: string | null;
      }
    | null;
  const ageGroup = roster?.age_group ?? null;
  const gender = roster?.gender ?? null;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const startingDateIso = roster?.billing_starts_on ?? roster?.created_at ?? null;
  const startingDate = startingDateIso ? fmtDate(startingDateIso) : null;
  const endDateIso = roster?.ended_on ?? null;
  const endDate = endDateIso ? fmtDate(endDateIso) : null;
  const daysStudying = startingDateIso
    ? Math.max(
        0,
        Math.floor(
          ((endDateIso ? new Date(endDateIso).getTime() : Date.now()) -
            new Date(startingDateIso).getTime()) /
            86_400_000,
        ),
      )
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your photo — visible to your teacher and classmates.
          </p>
        </div>
        <PrivacyNotice />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile photo</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            currentSignedUrl={signedUrl}
            fullName={profile.full_name}
            userId={user.id}
            ageGroup={ageGroup}
            gender={gender}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Max 5 MB · JPEG, PNG, or WebP · auto-resized to 512×512.
          </p>
        </CardContent>
      </Card>

      <LocationCard initial={(profile as { location?: string | null }).location ?? null} />

      <ChangePasswordCard
        isDemo={(user.email ?? "").toLowerCase().startsWith("demo.")}
      />

      {/* Meu currículo + (opcional) meus recibos. Só aparece quando
          o aluno está vinculado a um registro de aluno (roster). */}
      {myRoster.rosterId ? (
        <>
          <MyDocumentsCard
            rosterId={myRoster.rosterId}
            rosterCreatedAt={myRoster.createdAt}
            billingStartsOn={myRoster.billingStartsOn}
            receiptsVisible={myRoster.receiptsVisible}
            receipts={myReceipts}
          />
          <CertificatesPanel
            rosterStudentId={myRoster.rosterId}
            studentName={studentFullName}
            defaultStartOn={myRoster.billingStartsOn ?? myRoster.createdAt}
            certificates={myCertificates}
            readOnly
          />
        </>
      ) : null}

      <CefrExplainerCard />

      {startingDate ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Starting date · Data de início
                </p>
                <p className="mt-0.5 text-base font-semibold">
                  {startingDate}
                </p>
                {daysStudying !== null ? (
                  <p className="text-xs text-muted-foreground">
                    {daysStudying.toLocaleString("pt-BR")} days with us
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-border pt-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Calendar className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Last day · Último dia
                </p>
                <p className="mt-0.5 text-base font-semibold">
                  {endDate ?? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Active · Ativo
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {endDate
                    ? "Set by your teacher"
                    : "Your teacher will set this when your classes finish."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Como usar a Amazing School · How to use Amazing School
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Passeio rápido de ~10 minutos pelo painel, laboratório de
            fala, medalhas e tutor de IA. Abre em uma nova aba.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/guides/student.pt.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    Guia do aluno
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    🇧🇷 Português · 10 slides
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
            <a
              href="/guides/student.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    Student's guide
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    🇺🇸 English · 10 slides
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
