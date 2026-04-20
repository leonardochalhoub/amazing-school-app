import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/demo-signout
 *
 * Used by the middleware to evict a lingering demo session when the
 * visitor navigates to /login or /signup. Calling supabase.auth.signOut
 * from middleware doesn't reliably clear cookies in the browser — the
 * request cookies get mutated but the response the user sees still
 * carries the old sb-* tokens. A dedicated route handler runs in a
 * normal server context where both the Supabase cookie bridge AND the
 * response Set-Cookie headers line up, so the signOut actually takes
 * effect and the redirect that follows reaches /login with no session.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const target = new URL("/login", request.url);
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
