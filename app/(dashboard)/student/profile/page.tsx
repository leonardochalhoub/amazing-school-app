import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { ChangePasswordCard } from "@/components/shared/change-password-card";
import { LocationCard } from "@/components/shared/location-card";
import { UpcomingWindowCard } from "@/components/shared/upcoming-window-card";
import { PrivacyNotice } from "@/components/shared/privacy-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowUpRight, Calendar, Flame } from "lucide-react";
import { redirect } from "next/navigation";
import { MyDocumentsCard } from "@/components/reports/my-documents-card";
import { CertificatesPanel } from "@/components/reports/certificates-panel";
import { CefrExplainerCard } from "@/components/reports/cefr-explainer-card";
import { getMyRosterIdentity, listMyReceipts } from "@/lib/actions/reports";
import { listMyCertificates } from "@/lib/actions/certificates";
import { T } from "@/components/reports/t";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // Location is fetched separately so the page still renders if the
  // 051 migration hasn't been applied yet — a missing column would
  // otherwise null out the whole profile row and bounce the user.
  const { data: locationRow } = await admin
    .from("profiles")
    .select("location")
    .eq("id", user.id)
    .maybeSingle();
  const location =
    (locationRow as { location?: string | null } | null)?.location ?? null;

  // Upcoming-class popup window preference. Defaults to 5 when the
  // 053 migration hasn't been applied yet.
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
      timeZone: "America/Sao_Paulo",
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

      {/* Identity hero — avatar + name + age/gender + tenure stats
          all in one horizontal card at the top. Stacks on mobile. */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-pink-500/10"
          />
          <CardContent className="relative grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-6 lg:grid-cols-[auto_1fr_auto]">
            <div className="flex items-center justify-center sm:block">
              <AvatarUploader
                currentSignedUrl={signedUrl}
                fullName={profile.full_name}
                userId={user.id}
                ageGroup={ageGroup}
                gender={gender}
              />
            </div>
            <div className="min-w-0 space-y-1.5 self-center">
              <p className="truncate text-lg font-semibold sm:text-xl">
                {studentFullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {ageGroup ? `${ageGroup} · ` : ""}
                {gender ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Max 5 MB · JPEG / PNG / WebP · auto-resized to 512×512.
              </p>
            </div>
            {startingDate ? (
              <div className="grid gap-2 self-center sm:col-span-2 sm:grid-cols-3 lg:col-span-1 lg:grid-cols-1 lg:gap-3">
                <TenureStat
                  icon={<Flame className="h-4 w-4" />}
                  tone="amber"
                  label="Days with us · Dias conosco"
                  value={(daysStudying ?? 0).toLocaleString("pt-BR")}
                />
                <TenureStat
                  icon={<Calendar className="h-4 w-4" />}
                  tone="indigo"
                  label="Starting · Início"
                  value={startingDate}
                />
                <TenureStat
                  icon={<Calendar className="h-4 w-4" />}
                  tone="zinc"
                  label="Last day · Último"
                  value={
                    endDate ?? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Active · Ativo
                      </span>
                    )
                  }
                />
              </div>
            ) : null}
          </CardContent>
        </div>
      </Card>

      {/* Preferences + documents in two columns on lg */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <LocationCard initial={location} />
          {myRoster.rosterId ? (
            <MyDocumentsCard
              rosterId={myRoster.rosterId}
              rosterCreatedAt={myRoster.createdAt}
              billingStartsOn={myRoster.billingStartsOn}
              receiptsVisible={myRoster.receiptsVisible}
              receipts={myReceipts}
            />
          ) : null}
          {myRoster.rosterId ? (
            <CertificatesPanel
              rosterStudentId={myRoster.rosterId}
              studentName={studentFullName}
              defaultStartOn={myRoster.billingStartsOn ?? myRoster.createdAt}
              certificates={myCertificates}
              readOnly
            />
          ) : null}
        </div>
        <div className="space-y-4">
          <UpcomingWindowCard initial={upcomingWindow} />
          <ChangePasswordCard
            isDemo={(user.email ?? "").toLowerCase().startsWith("demo.")}
          />
        </div>
      </div>

      {/* CEFR scale — full page width so the 6-up grid gets maximum
          horizontal room to breathe. */}
      <CefrExplainerCard />

      {/* Onboarding guides — compact, full-width at the bottom */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            How to use Amazing School · Como usar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Quick ~10-minute tour of the dashboard, speaking lab, badges,
            and AI tutor. Opens in a new tab.
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

function TenureStat({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: "amber" | "indigo" | "zinc";
  label: string;
  value: React.ReactNode;
}) {
  const toneClass: Record<typeof tone, string> = {
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
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
