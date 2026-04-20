import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/heartbeat
 *
 * The SessionHeartbeat client hook pings this every ~30s while the
 * tab is focused and once more on pagehide (via fetch keepalive).
 * Each ping carries an integer number of seconds of focused time
 * since the previous flush — we simply insert it into
 * public.session_heartbeats. The sysadmin dashboard sums per-user
 * to derive precise time-on-site.
 *
 * Range check: 1..300 seconds. Anything longer is either a client
 * bug or a hostile actor trying to inflate their number; we drop it.
 * Anonymous requests get 401 — no freeloaders.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const raw = (body as { seconds?: unknown })?.seconds;
  const seconds = typeof raw === "number" ? Math.round(raw) : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 300) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await supabase
    .from("session_heartbeats")
    .insert({ user_id: user.id, seconds });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
