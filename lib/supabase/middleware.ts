import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  const isPublicMarketing =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/demo") ||
    request.nextUrl.pathname.startsWith("/join") ||
    request.nextUrl.pathname.startsWith("/api/demo-login") ||
    request.nextUrl.pathname.startsWith("/api/demo-signout");

  if (!user && !isAuthPage && !isPublicMarketing) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    // Demo sessions bleed through the landing page otherwise: a
    // visitor who explored as Luiza, closed the tab, and then hit
    // "Sign in" would be redirected straight back into Luiza without
    // ever seeing the login form. Bounce demo users to a dedicated
    // signout endpoint that properly clears sb-* cookies before
    // landing them on /login — doing signOut() here in middleware
    // doesn't reliably clear the browser cookies in the same cycle.
    const isDemoEmail = (user.email ?? "").toLowerCase().startsWith("demo.");
    if (isDemoEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/api/demo-signout";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    // Owner is treated as a super-teacher for routing purposes — they
    // land on /teacher just like any teacher, with the Sysadmin nav
    // entry available from there.
    const r = profile?.role;
    url.pathname = r === "teacher" || r === "owner" ? "/teacher" : "/student";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
