import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEMO_PRESETS, type DemoKind } from "@/lib/demo/presets";
import { logPublicClick } from "@/lib/actions/public-clicks";

/**
 * POST /api/demo-login
 *
 * Invoked by a form on the landing page with `target="_blank"`, so the
 * auth cookie is written inside the NEW tab. We then downgrade every
 * Supabase-session cookie to a "session cookie" (no Max-Age, no
 * Expires) so it dies the moment the visitor closes the tab / window /
 * browser — no lingering demo session, no stale cart of private data.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const kind = formData.get("kind") as DemoKind | null;
  if (!kind || !(kind in DEMO_PRESETS)) {
    return NextResponse.redirect(new URL("/?demo=unknown", request.url), 303);
  }
  const preset = DEMO_PRESETS[kind];
  // Demo accounts are public by design — the landing page button logs
  // any visitor into them with one click — so a fixed fallback
  // password isn't a security issue. Real teacher / student accounts
  // are protected by Supabase Auth password hashing, not by this
  // string. We still prefer the env value when it's set.
  const password =
    process.env.DEMO_ACCOUNT_PASSWORD ?? "demo-explore-amazing-school-2026";
  if (!process.env.DEMO_ACCOUNT_PASSWORD) {
    console.warn(
      "[demo-login] DEMO_ACCOUNT_PASSWORD env var not set — using fallback.",
    );
  }

  const supabase = await createClient();
  // Sign out any existing session first so Switch works cleanly: the
  // previous demo user's cookie gets cleared before the new one is set,
  // preventing stale identities from bleeding through to the next page.
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email: preset.email,
    password,
  });
  if (error) {
    return NextResponse.redirect(
      new URL("/?demo=unavailable", request.url),
      303,
    );
  }
  // Counter bump — fire-and-forget. Every successful demo login is
  // one row in public_click_events keyed to the demo persona, so the
  // sysadmin dashboard can show Luiza / Ana access counts.
  logPublicClick(
    kind === "teacher" ? "demo_teacher" : "demo_student",
  ).catch(() => {});
  const target = preset.role === "teacher" ? "/teacher" : "/student";
  const response = NextResponse.redirect(new URL(target, request.url), 303);

  // Demote every Supabase auth cookie to session-scope (no Max-Age /
  // Expires), so closing the tab / window / browser ends the demo
  // session. Pull the just-updated values from next/headers cookies()
  // — createClient() above wrote them there via the bridge.
  const store = await cookies();
  for (const c of store.getAll()) {
    if (!c.name.startsWith("sb-")) continue;
    response.cookies.set({
      name: c.name,
      value: c.value,
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      // Omit maxAge / expires → session cookie, vanishes on close.
    });
  }

  return response;
}
