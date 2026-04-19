import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMyAvatarUrl } from "@/lib/supabase/avatar-resolver";
import { isOwnerEmail } from "@/lib/auth/roles";
import { isLogoEligible, SCHOOL_LOGO_SRC } from "@/lib/school-logo";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DemoSwitchBar } from "@/components/demo/demo-switch-bar";
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
    .select("full_name, role, avatar_url, school_logo_enabled")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.error("Profile not found for user", user.id, error);
    redirect("/login");
  }

  const role = profile.role as Role;
  const avatarUrl = await resolveMyAvatarUrl(supabase, user.id);
  const isOwner = isOwnerEmail(user.email);

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

  const isDemo = (user.email ?? "").toLowerCase().startsWith("demo.");

  // White-label school logo: shown centered at the top of the nav for
  // whitelisted teacher accounts, only when they've flipped the toggle
  // on their Profile page. File lives at `public/T - 2.png`.
  const schoolLogoPath = resolveSchoolLogo({
    fullName: profile.full_name,
    email: user.email,
    enabled:
      (profile as { school_logo_enabled?: boolean }).school_logo_enabled ===
      true,
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
      {isDemo ? <DemoSwitchBar currentRole={role} /> : null}
      <Navbar
        fullName={profile.full_name}
        role={role}
        avatarUrl={avatarUrl}
        isOwner={isOwner}
        userId={user.id}
        ageGroup={rosterAgeGroup}
        gender={rosterGender}
        schoolLogoPath={schoolLogoPath}
      />
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
// White-label branding: the PNG lives at `public/T - 2.png`. Whitelisted
// teachers (Leo + Tatiana) get a toggle on their Profile page; when ON,
// this returns the image path, otherwise null.
// ---------------------------------------------------------------------------
function resolveSchoolLogo({
  fullName,
  email,
  enabled,
}: {
  fullName: string;
  email: string | null | undefined;
  enabled: boolean;
}): string | null {
  if (!enabled) return null;
  if (!isLogoEligible(email, fullName)) return null;
  return SCHOOL_LOGO_SRC;
}
