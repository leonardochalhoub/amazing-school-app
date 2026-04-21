import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import {
  isLogoEligible,
  schoolLogoPublicUrl,
  SCHOOL_LOGO_SRC,
} from "@/lib/school-logo";
import { isOwner as checkIsOwner } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DemoSwitchBar } from "@/components/demo/demo-switch-bar";
import { SessionHeartbeat } from "@/components/shared/session-heartbeat";
import { FillLocationPrompt } from "@/components/shared/fill-location-prompt";
import { UpcomingClassPrompt } from "@/components/shared/upcoming-class-prompt";
import { getMyNextClass } from "@/lib/actions/upcoming-class";
import type { Role } from "@/lib/supabase/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("full_name, role, avatar_url, school_logo_enabled, school_logo_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.error("Profile not found for user", user.id, error);
    redirect("/login");
  }

  // Self-heal the role: if a profile is marked 'teacher' but the
  // user is actually referenced by a non-deleted roster_students
  // row, they're a student whose signup slipped through with the
  // wrong default. Flip the row now and bounce the user to the
  // student dashboard — otherwise the middleware (which routes on
  // role after login) would have already steered them to /teacher
  // and they'd see a confusing mixed-state layout.
  let effectiveRole = profile.role as "teacher" | "student" | "owner";
  if (effectiveRole === "teacher") {
    const { data: asStudent } = await admin
      .from("roster_students")
      .select("id")
      .eq("auth_user_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (asStudent) {
      await admin
        .from("profiles")
        .update({ role: "student" })
        .eq("id", user.id);
      redirect("/student");
    }
  }

  const role = (effectiveRole === "owner" ? "teacher" : effectiveRole) as Role;

  // Soft-deleted-student gate: if a student's only roster rows are
  // all marked deleted (teacher removed them from the list), they
  // can't reach the student dashboard. Send them to the warm
  // "you've been removed" page. Students who were never rostered
  // pass through — they just have no teacher attached.
  if (role === "student") {
    const { data: rosterRows } = await admin
      .from("roster_students")
      .select("id, deleted_at")
      .eq("auth_user_id", user.id);
    const rows = (rosterRows ?? []) as Array<{
      id: string;
      deleted_at: string | null;
    }>;
    const hasActive = rows.some((r) => !r.deleted_at);
    const hadAnyRoster = rows.length > 0;
    if (!hasActive && hadAnyRoster) redirect("/removed");
  }

  const avatarUrl = await resolveMyAvatarUrl(supabase, user.id);
  // Owner check reuses the same helper that gates every sysadmin
  // action — DB role OR the origin-owner email backstop, memoised
  // per request via React.cache so this adds zero extra latency.
  const isOwner = await checkIsOwner();

  // Roster-linked students get a cartoon avatar fallback (matches the
  // one rendered on their dashboard) so the navbar doesn't drop to
  // initials when they don't have a real photo.
  const { data: rosterSelf } = await admin
    .from("roster_students")
    .select("age_group, gender")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const rosterAgeGroup = (rosterSelf as { age_group: "kid" | "teen" | "adult" | null } | null)?.age_group ?? null;
  const rosterGender = (rosterSelf as { gender: "female" | "male" | null } | null)?.gender ?? null;

  // Teacher gender lives on profiles.gender (migration 057). Fetched
  // separately so the layout still renders if the column doesn't
  // exist yet — falls back to null which reads as masculine pt-BR
  // wording.
  let teacherGender: "female" | "male" | null = null;
  if (role === "teacher") {
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
  }
  const navbarGender: "female" | "male" | null =
    role === "teacher" ? teacherGender : rosterGender;

  const isDemo = (user.email ?? "").toLowerCase().startsWith("demo.");

  // Profile location — fetched separately so the layout still renders
  // when migration 051 hasn't been applied yet.
  const { data: locationRow } = await admin
    .from("profiles")
    .select("location")
    .eq("id", user.id)
    .maybeSingle();
  const hasLocation =
    (
      (locationRow as { location?: string | null } | null)?.location ?? ""
    ).trim().length > 0;

  // Next scheduled class within the next 4 days (either taught or
  // attended by this user). Null when nothing qualifies. Wrapped
  // defensively — a failure here must not break the whole dashboard
  // layout, which is what would happen if the action threw and we
  // let it bubble up into the Server Component render.
  let nextClass: Awaited<ReturnType<typeof getMyNextClass>> | null = null;
  try {
    nextClass = await getMyNextClass();
  } catch (err) {
    console.warn("[upcoming-class] layout err", err);
  }

  // White-label school logo resolution:
  //   Teacher signed in → their own profile row
  //   Student signed in → find their teacher via roster_students, then
  //                       read that teacher's profile row
  // Whitelisted teachers (Leo, Tatiana) show the bundled
  // `/branding/school-logo.png` regardless of whether they've uploaded
  // one. Everyone else shows their uploaded file from the public
  // school-logos bucket. Both require school_logo_enabled = true.
  const schoolLogoPath = await resolveSchoolLogo({
    user,
    profile: profile as {
      full_name: string;
      school_logo_enabled: boolean | null;
      school_logo_url: string | null;
    },
    role,
    admin,
  });

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/8 via-violet-500/5 to-pink-500/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.035)_1px,transparent_0)] [background-size:22px_22px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)]" />
      </div>
      {/* Fire-and-forget focused-tab timer. Pings /api/heartbeat while
          this authenticated layout is mounted; pauses on visibilitychange,
          flushes on pagehide. Sysadmin's Time-on-site tables sum what
          this writes into session_heartbeats. */}
      <SessionHeartbeat />
      {isDemo ? <DemoSwitchBar currentRole={role} /> : null}
      <Navbar
        fullName={profile.full_name}
        role={role}
        avatarUrl={avatarUrl}
        isOwner={isOwner}
        userId={user.id}
        ageGroup={rosterAgeGroup}
        gender={navbarGender}
        schoolLogoPath={schoolLogoPath}
      />
      <UpcomingClassPrompt
        items={nextClass?.items ?? []}
        debug={nextClass?.debug ?? null}
      />
      <FillLocationPrompt show={!hasLocation} role={role} />
      <main className="w-full min-w-0 flex-1 overflow-x-clip">
        <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-clip px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// White-label branding.
//   Whitelisted teachers (Leo + Tatiana) → bundled school-logo.png.
//   Every other teacher → their own uploaded PNG/JPG from school-logos.
//   Students → whatever their teacher has configured.
// The toggle (profiles.school_logo_enabled) gates the render in all
// cases, so a teacher who hasn't flipped it sees the default brand.
// ---------------------------------------------------------------------------
type ResolverInput = {
  user: { id: string; email?: string };
  profile: {
    full_name: string;
    school_logo_enabled: boolean | null;
    school_logo_url: string | null;
  };
  role: Role;
  admin: ReturnType<typeof createAdminClient>;
};
async function resolveSchoolLogo(
  args: ResolverInput,
): Promise<string | null> {
  if (args.role === "teacher") {
    return logoForTeacher({
      email: args.user.email ?? null,
      fullName: args.profile.full_name,
      enabled: args.profile.school_logo_enabled === true,
      uploadedPath: args.profile.school_logo_url,
    });
  }
  // Student: look up their teacher via the roster link, then render
  // whatever that teacher has configured.
  const { data: roster } = await args.admin
    .from("roster_students")
    .select("teacher_id")
    .eq("auth_user_id", args.user.id)
    .maybeSingle();
  const teacherId = (roster as { teacher_id?: string } | null)?.teacher_id;
  if (!teacherId) return null;
  const { data: teacherProfile } = await args.admin
    .from("profiles")
    .select("full_name, school_logo_enabled, school_logo_url")
    .eq("id", teacherId)
    .maybeSingle();
  if (!teacherProfile) return null;
  const tp = teacherProfile as {
    full_name: string;
    school_logo_enabled: boolean | null;
    school_logo_url: string | null;
  };
  // Cross-reference email for the whitelist check. Pull it from
  // auth.users via the admin API only when we actually need it.
  let teacherEmail: string | null = null;
  try {
    const { data } = await args.admin.auth.admin.getUserById(teacherId);
    teacherEmail = data?.user?.email ?? null;
  } catch {
    /* non-fatal */
  }
  return logoForTeacher({
    email: teacherEmail,
    fullName: tp.full_name,
    enabled: tp.school_logo_enabled === true,
    uploadedPath: tp.school_logo_url,
  });
}

function logoForTeacher({
  email,
  fullName,
  enabled,
  uploadedPath,
}: {
  email: string | null | undefined;
  fullName: string;
  enabled: boolean;
  uploadedPath: string | null;
}): string | null {
  if (!enabled) return null;
  // Priority: the teacher's own upload wins over the whitelisted
  // bundled asset. Whitelisted teachers get the bundled file as a
  // default they can override at any time.
  const uploaded = schoolLogoPublicUrl(uploadedPath);
  if (uploaded) return uploaded;
  if (isLogoEligible(email, fullName)) return SCHOOL_LOGO_SRC;
  return null;
}
