import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRosterStudent, getRosterAvatarSignedUrl } from "@/lib/actions/roster";
import { AvatarDisplay } from "@/components/shared/avatar-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificatesPanel } from "@/components/reports/certificates-panel";
import { CefrExplainerCard } from "@/components/reports/cefr-explainer-card";
import { listCertificatesForStudent } from "@/lib/actions/certificates";

/**
 * Teacher's read-only view of a student's profile — rendered exactly
 * as the student sees it but without edit controls. Meant to be
 * opened from the per-student page in a new browser tab so the
 * teacher can see what the student sees without leaving their own
 * workspace.
 */
export default async function StudentViewAsStudent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const student = await getRosterStudent(id);
  if (!student) notFound();

  const admin = createAdminClient();

  // Locate the student's signed-in identity (if they claimed the
  // invite) to read their own profile row (location lives there).
  let profileLocation: string | null = null;
  let selfAvatarSignedUrl: string | null = null;
  if (student.auth_user_id) {
    const { data: selfProfile } = await admin
      .from("profiles")
      .select("location, avatar_url")
      .eq("id", student.auth_user_id)
      .maybeSingle();
    profileLocation =
      (selfProfile as { location?: string | null } | null)?.location ?? null;
    if ((selfProfile as { avatar_url?: string | null } | null)?.avatar_url) {
      const { data } = await admin.storage
        .from("avatars")
        .createSignedUrl(`${student.auth_user_id}.webp`, 3600);
      selfAvatarSignedUrl = data?.signedUrl ?? null;
    }
  }

  const rosterAvatarUrl = student.has_avatar
    ? await getRosterAvatarSignedUrl(id)
    : null;
  const avatarUrl = selfAvatarSignedUrl ?? rosterAvatarUrl;

  const certificates = await listCertificatesForStudent(id);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const startingDateIso =
    student.billing_starts_on ?? student.created_at ?? null;
  const startingDate = startingDateIso ? fmtDate(startingDateIso) : null;
  const endDateIso = student.ended_on ?? null;
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

  const isFemale = student.gender === "female";
  const studentWord = isFemale ? "aluna" : "aluno";
  const studentArticle = isFemale ? "da" : "do";

  return (
    <div className="space-y-4">
      {/* Upper bar — prominent read-only context for the teacher */}
      <div className="sticky top-16 z-30 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-indigo-400/40 bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-pink-500/10 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-indigo-500/20 px-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <Eye className="h-3 w-3" />
            Perfil {studentArticle} {studentWord} · Student's profile view
          </span>
          <span className="truncate font-medium">{student.full_name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/teacher/students/${id}`}
            className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-1 font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à gestão
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Como o {studentWord} vê essa página. Somente leitura.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile photo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <AvatarDisplay
              fullName={student.full_name}
              signedUrl={avatarUrl}
              className="h-24 w-24"
            />
            <div className="space-y-1">
              <p className="text-base font-semibold">{student.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {student.age_group ? `${student.age_group} · ` : ""}
                {student.gender ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Location · Localização
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileLocation ? (
              <p className="text-sm font-medium">{profileLocation}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                O {studentWord} ainda não preencheu a localização.
              </p>
            )}
          </CardContent>
        </Card>

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
                      {daysStudying.toLocaleString("pt-BR")} dias conosco
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
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <CertificatesPanel
          rosterStudentId={id}
          studentName={student.full_name}
          defaultStartOn={startingDateIso ?? new Date().toISOString()}
          certificates={certificates}
          readOnly
        />

        <CefrExplainerCard />
      </div>
    </div>
  );
}
