import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/demo-signout
 *
 * Signs the current demo session out and redirects (303) to either
 * /login (default) or a ?to=/... path override. The middleware bounces
 * demo users off /login and /signup here when they try to sign into
 * a real account, and the DemoSwitchBar's "Exit & create account"
 * button submits here to end the demo.
 *
 * POST-only because this route has a side effect (clearing cookies).
 * A GET variant would get prefetched by Next.js <Link> hover /
 * autoprefetch, quietly killing the demo session before the user
 * actually clicked anything.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Accept an optional ?to= override so the demo banner's "Exit"
  // button can drop the visitor on the landing page with its signup
  // CTA instead of the login form. Paths only — never allow an
  // external redirect target.
  const raw = request.nextUrl.searchParams.get("to");
  const safePath = raw && raw.startsWith("/") && !raw.startsWith("//")
    ? raw
    : "/login";
  const target = new URL(safePath, request.url);
  const response = NextResponse.redirect(target, 303);
  // Belt-and-suspenders: null every sb-* cookie on the response so
  // even if the signOut cookie-clear didn't land, the browser still
  // forgets the session.
  const store = await cookies();
  for (const c of store.getAll()) {
    if (!c.name.startsWith("sb-")) continue;
    response.cookies.set({
      name: c.name,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
