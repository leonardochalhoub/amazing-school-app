import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/weather/log
 *
 * The ClockWeatherCard pings this after each successful Open-Meteo
 * fetch with the current temperature + WMO weather code. One row per
 * fetch lands in weather_observations — migration 061 uses those
 * rows to drive the weather-themed badges (survivor_42,
 * heatwave_35_3d, rain_scholar).
 *
 * We rate-limit by dropping any ping within 10 minutes of the user's
 * latest row — the card refreshes every 15 min anyway, so this only
 * swats noise from dev hot-reloads and double-mounts.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const raw = body as { temp_c?: unknown; weather_code?: unknown } | null;
  const temp = typeof raw?.temp_c === "number" ? raw.temp_c : NaN;
  const code =
    typeof raw?.weather_code === "number" ? Math.round(raw.weather_code) : null;
  if (!Number.isFinite(temp) || temp < -80 || temp > 70) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();

  // Rate-limit: skip if the most recent row is < 10 min old.
  const { data: recent } = await admin
    .from("weather_observations")
    .select("observed_at")
    .eq("user_id", user.id)
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.observed_at) {
    const ageMs = Date.now() - new Date(recent.observed_at).getTime();
    if (ageMs < 10 * 60 * 1000) {
      return NextResponse.json({ ok: true, skipped: true });
    }
  }

  const { error } = await admin.from("weather_observations").insert({
    user_id: user.id,
    temp_c: temp,
    weather_code: code,
  });
  if (error) {
    console.error("weather log insert:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
