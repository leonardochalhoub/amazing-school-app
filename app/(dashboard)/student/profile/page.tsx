import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvatarSignedUrl } from "@/lib/supabase/signed-urls";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
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

  const signedUrl = profile.avatar_url
    ? await getAvatarSignedUrl(supabase, user.id)
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your photo — visible to your teacher and classmates.
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
