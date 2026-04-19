import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { PrivacyNotice } from "@/components/shared/privacy-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { redirect } from "next/navigation";

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

  const signedUrl = await resolveMyAvatarUrl(supabase, user.id);
  const { data: rosterSelf } = await admin
    .from("roster_students")
    .select("age_group, gender")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const ageGroup =
    (rosterSelf as { age_group: "kid" | "teen" | "adult" | null } | null)
      ?.age_group ?? null;
  const gender =
    (rosterSelf as { gender: "female" | "male" | null } | null)?.gender ?? null;

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
