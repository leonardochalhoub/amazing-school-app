import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTeacherListeningResponses } from "@/lib/actions/listening-responses";
import { ListeningReviewList } from "@/components/teacher/listening-review-list";
import { isTeacherRole } from "@/lib/auth/roles";

export default async function TeacherListeningResponsesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole(profile?.role as string | null | undefined)) redirect("/student");

  const rows = await listTeacherListeningResponses();
  const pending = rows.filter((r) => !r.reviewed_at).length;

  return (
    <div className="space-y-6 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Teacher · Listening reviews
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Listening responses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Student interpretations of listening stories. Unreviewed responses
          appear first. Leave a short comment and a score (0–100) to close
          the loop.
          {pending > 0 ? (
            <span className="ml-1 font-medium text-foreground">
              {pending} pending.
            </span>
          ) : null}
        </p>
      </header>

      <ListeningReviewList rows={rows} />
    </div>
  );
}