import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { ChangePasswordCard } from "@/components/shared/change-password-card";
import { LocationCard } from "@/components/shared/location-card";
import { PrivacyNotice } from "@/components/shared/privacy-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, ArrowUpRight, Image as ImageIcon, PenTool } from "lucide-react";
import { redirect } from "next/navigation";
import { isLogoEligible, SCHOOL_LOGO_SRC } from "@/lib/school-logo";
import { SchoolLogoToggle } from "@/components/teacher/school-logo-toggle";
import { SignatureUploader } from "@/components/teacher/signature-uploader";
import { CefrExplainerCard } from "@/components/reports/cefr-explainer-card";
import { getSignatureSignedUrl } from "@/lib/signature";

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
      "full_name, avatar_url, role, school_logo_enabled, school_logo_url, signature_url, signature_enabled",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  if (profile.role !== "teacher" && profile.role !== "owner") redirect("/student/profile");

  // Location column is fetched separately so the page still renders
  // if the 051 migration hasn't been applied yet.
  const { data: locationRow } = await admin
    .from("profiles")
    .select("location")
    .eq("id", user.id)
    .maybeSingle();
  const location =
    (locationRow as { location?: string | null } | null)?.location ?? null;

  const signedUrl = await resolveMyAvatarUrl(supabase, user.id);
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your photo — visible to your students.
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
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Max 5 MB · JPEG, PNG, or WebP · auto-resized to 512×512.
          </p>
        </CardContent>
      </Card>

      <LocationCard initial={location} />

      <ChangePasswordCard
        isDemo={(user.email ?? "").toLowerCase().startsWith("demo.")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-primary" />
            School brand logo
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
            Assinatura digital
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

      <CefrExplainerCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding guides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Quick-reference presentations. Open them in a new tab — use
            the arrow keys or scroll to navigate the slides.
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
