import { redirect } from "next/navigation";
import { Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { isTeacherRole } from "@/lib/auth/roles";
import { listCommunityPosts } from "@/lib/actions/teacher-community";
import { CommunityFeed } from "@/components/teacher/community-feed";
import { T } from "@/components/reports/t";

/**
 * Teacher community wall — Facebook/Instagram/Orkut-style feed where
 * teachers share tips, suggest lessons, and talk to each other. The
 * page shows the latest 10 posts with a "load more" button.
 */
export default async function TeacherCommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name, location")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole(profile?.role as string | null | undefined)) redirect("/student");

  const [initialPosts, myAvatar] = await Promise.all([
    listCommunityPosts({ limit: 10 }),
    resolveMyAvatarUrl(supabase, user.id),
  ]);
  const me = {
    id: user.id,
    name: (profile as { full_name?: string | null } | null)?.full_name ?? null,
    location: (profile as { location?: string | null } | null)?.location ?? null,
    avatarUrl: myAvatar,
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-20">
      <header className="flex items-end gap-3">
        <div
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-white shadow-lg"
        >
          <Users2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <T en="Community" pt="Comunidade" />
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            <T en="Teachers' wall" pt="Mural dos professores" />
          </h1>
          <p className="text-sm text-muted-foreground">
            <T
              en="Share a thought, suggest a lesson, ask for help — your colleagues are listening."
              pt="Compartilhe uma ideia, sugira uma lição, peça ajuda — seus colegas estão ouvindo."
            />
          </p>
        </div>
      </header>

      <CommunityFeed initialPosts={initialPosts} me={me} />
    </div>
  );
}
