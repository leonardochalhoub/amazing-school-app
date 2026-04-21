import { NextResponse } from "next/server";
import {
  extractClickMetadata,
  logPublicClick,
  type PublicClickKind,
} from "@/lib/actions/public-clicks";
import { createClient } from "@/lib/supabase/server";

// Force every GET through the Node runtime — otherwise Vercel's edge
// cache serves the first 302 to every subsequent visitor and our
// insert never fires, dropping the counter to 1.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Thin trackable redirect: /r/<slug> logs one public_click_events row
 * then 302s to the real asset. Used for documentation links so the
 * sysadmin dashboard can count "Teacher docs" / "Student docs PT" /
 * "Student docs EN" even though the assets live under /guides/*.html
 * and are served by Vercel's static edge (no server code to hook).
 *
 * Swallows the logging error so a DB outage never breaks the
 * redirect — the worst case is the click doesn't count, which is
 * fine for a best-effort analytic.
 */
const TARGET: Record<
  string,
  { kind: PublicClickKind; href: string }
> = {
  "teacher-docs": { kind: "doc_teacher", href: "/guides/teacher.html" },
  "student-docs-pt": {
    kind: "doc_student_pt",
    href: "/guides/student.pt.html",
  },
  "student-docs-en": {
    kind: "doc_student_en",
    href: "/guides/student.html",
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const target = TARGET[kind];
  if (!target) return NextResponse.redirect(new URL("/", req.url));

  // Pull the signed-in user id opportunistically so we can tag
  // clicks from logged-in users. Anonymous visitors stay null.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* anonymous */
  }

  // Fire-and-forget — don't block the redirect on the insert.
  logPublicClick(target.kind, extractClickMetadata(req, userId)).catch(
    () => {},
  );
  return NextResponse.redirect(new URL(target.href, req.url));
}
