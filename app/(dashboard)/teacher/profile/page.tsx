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
  Award,
} from "lucide-react";
import { redirect } from "next/navigation";
import { isLogoEligible, SCHOOL_LOGO_SRC } from "@/lib/school-logo";
import { SchoolLogoToggle } from "@/components/teacher/school-logo-toggle";
import { SignatureUploader } from "@/components/teacher/signature-uploader";
import { TeacherGenderPicker } from "@/components/teacher/teacher-gender-picker";
import { CefrExplainerCard } from "@/components/reports/cefr-explainer-card";
import { getSignatureSignedUrl } from "@/lib/signature";
import { T } from "@/components/reports/t";
import { TeacherXpToggle } from "@/components/teacher/teacher-xp-toggle";
import {
  SelfCurriculumPanel,
  type SelfCurriculumRow,
} from "@/components/teacher/self-curriculum-panel";
import { getTeacherSelfAssignments } from "@/lib/actions/teacher-self-assignments";
import { getAssignableLessons } from "@/lib/actions/assignable-lessons";
import { listMusic, fromAssignmentSlug, getMusic } from "@/lib/content/music";
import { findMeta as findLessonMeta } from "@/lib/content/loader";

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

  // xp_enabled appears on profiles only after migration 062 has run.
  // Read it defensively so this page still renders on a fresh DB.
  let xpEnabledFlag = true;
  try {
    const { data: xpRow } = await admin
      .from("profiles")
      .select("xp_enabled")
      .eq("id", user.id)
      .maybeSingle();
    const raw = (xpRow as { xp_enabled?: boolean | null } | null)?.xp_enabled;
    if (raw === false) xpEnabledFlag = false;
  } catch {
    /* column absent → default on */
  }

  if (!profile) redirect("/login");
  if (profile.role !== "teacher" && profile.role !== "owner") redirect("/student/profile");

  // Gender is the explicit profiles.gender column (migration 057).
  // No name inference — masculine defaults when null.
  let teacherGender: "female" | "male" | null = null;
  try {
    const { data: genderRow } = await admin
      .from("profiles")
      .select("gender")
      .eq("id", user.id)
      .maybeSingle();
    const raw = (genderRow as { gender?: string | null } | null)?.gender ?? null;
    if (raw === "female" || raw === "male") teacherGender = raw;
  } catch {
    /* column may be absent until migration 057 lands */
  }

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

  // Teacher self-curriculum — rows where assigned_by = student_id =
  // teacher.id. Joined with lesson_progress so "Concluída" on the
  // panel reflects real completions even when the assignment row
  // stayed classroom-wide. Lessons + music lists feed the picker
  // behind the "Atribuir para mim" button.
  const [selfAssignmentsRaw, assignableLessons] = await Promise.all([
    getTeacherSelfAssignments(50),
    getAssignableLessons(),
  ]);
  const musicsForPicker = listMusic();
  const selfCurriculumRows: SelfCurriculumRow[] = selfAssignmentsRaw.map((a) => {
    const { kind, slug } = fromAssignmentSlug(a.lessonSlug);
    if (kind === "music") {
      const m = getMusic(slug);
      return {
        assignmentId: a.id,
        slug,
        kind,
        title: m ? `${m.artist} — ${m.title}` : slug,
        cefr: m?.cefr_level ?? null,
        category: "music",
        minutes: m ? Math.max(5, Math.round((m.duration_seconds / 60) * 2)) : null,
        assignedAt: a.assignedAt ?? "",
        completedAt: a.completedAt,
      };
    }
    const draft = assignableLessons.find((l) => l.slug === slug);
    const fileMeta = findLessonMeta(slug);
    return {
      assignmentId: a.id,
      slug,
      kind: "lesson" as const,
      title: draft?.title ?? fileMeta?.title ?? slug,
      cefr: (draft?.cefr_level ?? fileMeta?.cefr_level) ?? null,
      category: draft?.category ?? fileMeta?.category ?? null,
      minutes: fileMeta?.estimated_minutes ?? null,
      assignedAt: a.assignedAt ?? "",
      completedAt: a.completedAt,
    };
  });

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
            <div className="flex items-center justify-center self-center">
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
                  <T
                    en="Owner · Teacher"
                    pt={
                      teacherGender === "female"
                        ? "Proprietária · Professora"
                        : "Proprietário · Professor"
                    }
                  />
                ) : (
                  <T
                    en="Teacher"
                    pt={teacherGender === "female" ? "Professora" : "Professor"}
                  />
                )}
              </p>
              <TeacherGenderPicker initial={teacherGender} />
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

      {/* XP experience opt-in — owns a full row above the preferences
          grid. Data is preserved when off; flipping back on resumes
          from the same spot with every earned badge intact. */}
      <TeacherXpToggle initialEnabled={xpEnabledFlag} />

      {/* Deep-link to the full badge discovery grid. Only visible
          when XP is enabled — a locked-XP teacher has nothing to
          see there. Matches the home-page XP strip which lost its
          own "Ver todas" link per UX feedback. */}
      {xpEnabledFlag ? (
        <a
          href="/teacher/badges"
          className="group inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Award className="h-4 w-4 text-indigo-500" />
          <T en="See all badges" pt="Ver todas as medalhas" />
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      ) : null}

      {/* Teacher's own curriculum — self-assignments + "Atribuir
          para mim" button. Reuses the standard AssignLessonButton
          dialog in single-student mode, which hides the "whom to
          assign to" section entirely so every pick lands on the
          teacher's own profile.id. */}
      <SelfCurriculumPanel
        teacher={{ id: user.id, fullName: profile.full_name }}
        entries={selfCurriculumRows}
        lessons={assignableLessons}
        musics={musicsForPicker}
      />

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
              href="/r/teacher-docs"
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
              href="/r/student-docs-pt"
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
              href="/r/student-docs-en"
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
