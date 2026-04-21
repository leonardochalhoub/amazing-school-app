import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { ChangePasswordCard } from "@/components/shared/change-password-card";
import { LocationCard } from "@/components/shared/location-card";
import { UpcomingWindowCard } from "@/components/shared/upcoming-window-card";
import { PrivacyNotice } from "@/components/shared/privacy-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  GraduationCap,
  ArrowUpRight,
  Image as ImageIcon,
  PenTool,
  Flame,
  Calendar,
  School,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { isLogoEligible, SCHOOL_LOGO_SRC } from "@/lib/school-logo";
import { SchoolLogoToggle } from "@/components/teacher/school-logo-toggle";
import { SignatureUploader } from "@/components/teacher/signature-uploader";
import { CefrExplainerCard } from "@/components/reports/cefr-explainer-card";
import { getSignatureSignedUrl } from "@/lib/signature";
import { T } from "@/components/reports/t";

export default async function TeacherProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "full_name, avatar_url, role, school_logo_enabled, school_logo_url, signature_url, signature_enabled, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  if (profile.role !== "teacher" && profile.role !== "owner") redirect("/student/profile");

  const { data: locationRow } = await admin
    .from("profiles")
    .select("location")
    .eq("id", user.id)
    .maybeSingle();
  const location =
    (locationRow as { location?: string | null } | null)?.location ?? null;

  let upcomingWindow = 5;
  try {
    const { data: winRow } = await admin
      .from("profiles")
      .select("upcoming_class_window_days")
      .eq("id", user.id)
      .maybeSingle();
    const raw = (
      winRow as { upcoming_class_window_days?: number | null } | null
    )?.upcoming_class_window_days;
    if (typeof raw === "number") upcomingWindow = raw;
  } catch {
    /* column may be absent */
  }

  const [signedUrl, classroomsRes, studentsRes] = await Promise.all([
    resolveMyAvatarUrl(supabase, user.id),
    admin
      .from("classrooms")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id),
    admin
      .from("roster_students")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .is("ended_on", null),
  ]);
  const classroomCount = classroomsRes.count ?? 0;
  const studentsCount = studentsRes.count ?? 0;

  const logoEligible = isLogoEligible(user.email, profile.full_name);
  const logoEnabled =
    (profile as { school_logo_enabled?: boolean }).school_logo_enabled === true;
  const uploadedLogoPath =
    (profile as { school_logo_url?: string | null }).school_logo_url ?? null;
  const signatureEnabled =
    (profile as { signature_enabled?: boolean }).signature_enabled === true;
  const signatureSignedUrl = (profile as { signature_url?: string | null })
    .signature_url
    ? await getSignatureSignedUrl(admin, user.id)
    : null;

  const createdAtIso =
    (profile as { created_at?: string | null }).created_at ?? null;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const teachingSince = createdAtIso ? fmtDate(createdAtIso) : null;
  const daysTeaching = createdAtIso
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(createdAtIso).getTime()) / 86_400_000),
      )
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            <T en="Profile" pt="Perfil" />
          </h1>
          <p className="text-sm text-muted-foreground">
            <T
              en="Manage your photo, preferences, and account details."
              pt="Gerencie sua foto, preferências e detalhes da conta."
            />
          </p>
        </div>
        <PrivacyNotice />
      </div>

      {/* Identity hero */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-sky-500/10"
          />
          <CardContent className="relative grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-6 lg:grid-cols-[auto_1fr_auto]">
            <div className="flex items-center justify-center">
              <AvatarUploader
                currentSignedUrl={signedUrl}
                fullName={profile.full_name}
                userId={user.id}
              />
            </div>
            <div className="min-w-0 space-y-1.5 self-center">
              <p className="truncate text-lg font-semibold sm:text-xl">
                {profile.full_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile.role === "owner" ? (
                  <T en="Owner · Teacher" pt="Proprietário · Professor" />
                ) : (
                  <T en="Teacher" pt="Professor" />
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                <T
                  en="Your photo is visible to your students across the platform."
                  pt="Sua foto é visível para os alunos em toda a plataforma."
                />
              </p>
            </div>
            {teachingSince ? (
              <div className="grid gap-2 self-center sm:col-span-2 sm:grid-cols-3 lg:col-span-1 lg:grid-cols-1 lg:gap-3">
                <TenureStat
                  icon={<School className="h-4 w-4" />}
                  tone="violet"
                  label={<T en="Classrooms" pt="Turmas" />}
                  value={classroomCount.toLocaleString("pt-BR")}
                />
                <TenureStat
                  icon={<Users className="h-4 w-4" />}
                  tone="sky"
                  label={<T en="Active students" pt="Alunos ativos" />}
                  value={studentsCount.toLocaleString("pt-BR")}
                />
                <TenureStat
                  icon={<Flame className="h-4 w-4" />}
                  tone="amber"
                  label={<T en="Days teaching" pt="Dias ensinando" />}
                  value={(daysTeaching ?? 0).toLocaleString("pt-BR")}
                />
                <TenureStat
                  icon={<Calendar className="h-4 w-4" />}
                  tone="zinc"
                  label={<T en="Teaching since" pt="Ensinando desde" />}
                  value={teachingSince}
                />
              </div>
            ) : null}
          </CardContent>
        </div>
      </Card>

      {/* Preferences in two columns on lg */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <LocationCard initial={location} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4 text-primary" />
                <T en="School brand logo" pt="Logo da escola" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SchoolLogoToggle
                initialEnabled={logoEnabled}
                whitelistLogoSrc={logoEligible ? SCHOOL_LOGO_SRC : null}
                uploadedLogoPath={uploadedLogoPath}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PenTool className="h-4 w-4 text-primary" />
                <T en="Digital signature" pt="Assinatura digital" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureUploader
                initialEnabled={signatureEnabled}
                initialSignedUrl={signatureSignedUrl}
                teacherName={profile.full_name}
              />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <UpcomingWindowCard initial={upcomingWindow} />
          <div className="flex flex-1">
            <ChangePasswordCard
              isDemo={(user.email ?? "").toLowerCase().startsWith("demo.")}
            />
          </div>
        </div>
      </div>

      {/* CEFR scale — full page width */}
      <CefrExplainerCard />

      {/* Onboarding guides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <T en="Onboarding guides" pt="Guias de onboarding"  />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            <T
              en="Quick-reference presentations. Open them in a new tab — use the arrow keys or scroll to navigate the slides."
              pt="Apresentações de referência rápida. Abrem em nova aba — use as setas ou o scroll para navegar pelos slides."
            />
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href="/guides/teacher.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    Teacher's guide
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    🇺🇸 English · 12 slides
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
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

function TenureStat({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: "amber" | "violet" | "sky" | "zinc";
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  const toneClass: Record<typeof tone, string> = {
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    zinc: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/60 p-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
