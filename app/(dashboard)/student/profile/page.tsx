import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { PrivacyNotice } from "@/components/shared/privacy-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    </div>
  );
}
