import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEMO_PRESETS, type DemoKind } from "@/lib/demo/presets";

/**
 * POST /api/demo-login
 *
 * Invoked by a form on the landing page with `target="_blank"`, so the
 * signup cookie is set inside the NEW tab — the original landing tab keeps
 * its own (anonymous) session. In the same browser the two demo tabs still
 * share the session, so flipping between teacher and student requires
 * re-clicking the corresponding button, or using a private window for the
 * second persona.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const kind = formData.get("kind") as DemoKind | null;
  if (!kind || !(kind in DEMO_PRESETS)) {
    return NextResponse.redirect(new URL("/?demo=unknown", request.url), 303);
  }
  const preset = DEMO_PRESETS[kind];
  const password =
    process.env.DEMO_ACCOUNT_PASSWORD ?? "demo-explore-amazing-school-2026";

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
  const target = preset.role === "teacher" ? "/teacher" : "/student";
  return NextResponse.redirect(new URL(target, request.url), 303);
}
