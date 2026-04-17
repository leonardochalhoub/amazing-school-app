import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function TeacherProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  if (profile.role !== "teacher") redirect("/student/profile");

  const signedUrl = await resolveMyAvatarUrl(supabase, user.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your photo — visible to your students.
        </p>
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
    </div>
  );
}
