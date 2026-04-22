"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  Snowflake,
  CloudLightning,
  Zap,
  Thermometer,
  type LucideProps,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  /** City label shown in the meta line ("São Paulo, SP"). Optional. */
  label?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface Condition {
  /** lucide icon — rendered inline. */
  Icon: ComponentType<LucideProps>;
  /** Tailwind color utility for the icon (drives the WMO semantics:
   *  yellow for sun, slate for cloud, sky-blue for rain, etc.). */
  color: string;
  pt: string;
  en: string;
}

function describe(code: number): Condition {
  if (code === 0)
    return { Icon: Sun, color: "text-amber-400", pt: "Céu limpo", en: "Clear sky" };
  if (code === 1)
    return { Icon: Sun, color: "text-amber-300", pt: "Quase limpo", en: "Mostly clear" };
  if (code === 2)
    return { Icon: CloudSun, color: "text-amber-300", pt: "Parcialmente nublado", en: "Partly cloudy" };
  if (code === 3)
    return { Icon: Cloud, color: "text-slate-400", pt: "Nublado", en: "Overcast" };
  if (code === 45 || code === 48)
    return { Icon: CloudFog, color: "text-slate-400", pt: "Neblina", en: "Fog" };
  if (code >= 51 && code <= 57)
    return { Icon: CloudDrizzle, color: "text-sky-400", pt: "Garoa", en: "Drizzle" };
  if (code >= 61 && code <= 67)
    return { Icon: CloudRain, color: "text-sky-500", pt: "Chuva", en: "Rain" };
  if (code >= 71 && code <= 77)
    return { Icon: Snowflake, color: "text-sky-200", pt: "Neve", en: "Snow" };
  if (code >= 80 && code <= 82)
    return { Icon: CloudRainWind, color: "text-sky-500", pt: "Pancadas de chuva", en: "Rain showers" };
  if (code >= 85 && code <= 86)
    return { Icon: CloudSnow, color: "text-sky-300", pt: "Pancadas de neve", en: "Snow showers" };
  if (code === 95)
    return { Icon: CloudLightning, color: "text-violet-400", pt: "Tempestade", en: "Thunderstorm" };
  if (code === 96 || code === 99)
    return { Icon: Zap, color: "text-violet-500", pt: "Tempestade com granizo", en: "Storm w/ hail" };
  return { Icon: Thermometer, color: "text-muted-foreground", pt: "Tempo indefinido", en: "Weather unknown" };
}

interface WeatherNow {
  temperature: number;
  condition: Condition;
}

interface DailyForecast {
  /** ISO date string "YYYY-MM-DD" (locale-naïve, tz pinned to Brasília). */
  date: string;
  hi: number;
  lo: number;
  condition: Condition;
}

/**
 * Inline, futuristic clock + 3-day weather forecast. Designed to sit
 * flush inside the welcome-hero card — no outer border, no gradient
 * background of its own, so the host container's styling shows
 * through. Clock digits pick up a violet→pink gradient to feel at
 * home against the brand palette.
 *
 * Time-zone is pinned to America/Sao_Paulo (Brasília) — the dateline
 * below the clock says so in both locales so a viewer anywhere on
 * earth reading this at 3am PT isn't confused. Weather data comes
 * from Open-Meteo (free, no API key); the daily endpoint returns
 * today + forecast_days, which the card renders as three compact
 * day chips (today + next 2).
 */
export function ClockWeatherCard({ label, lat, lng }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (lat == null || lng == null) return;
    let alive = true;
    const load = async () => {
      try {
        // forecast_days=3 → today + next 2. Open-Meteo aligns days to
        // the `timezone=auto` slot so the three entries match the
        // student/teacher's local calendar rather than UTC.
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lng}` +
          `&current=temperature_2m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
          `&forecast_days=3&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
          daily?: {
            time?: string[];
            temperature_2m_max?: number[];
            temperature_2m_min?: number[];
            weather_code?: number[];
          };
        };
        if (!alive) return;
        const t = json.current?.temperature_2m;
        const c = json.current?.weather_code;
        if (t != null && c != null) {
          setWeather({ temperature: Math.round(t), condition: describe(c) });
          // Log the observation for weather-themed badges. Fire-and-
          // forget — the endpoint rate-limits itself to one row per
          // 10 min per user, so repeated mounts in dev are harmless.
          try {
            void fetch("/api/weather/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ temp_c: t, weather_code: c }),
              keepalive: true,
            });
          } catch {
            /* best-effort */
          }
        }
        const d = json.daily;
        if (d?.time && d.temperature_2m_max && d.temperature_2m_min && d.weather_code) {
          const rows: DailyForecast[] = d.time.slice(0, 3).map((iso, i) => ({
            date: iso,
            hi: Math.round(d.temperature_2m_max![i] ?? 0),
            lo: Math.round(d.temperature_2m_min![i] ?? 0),
            condition: describe(d.weather_code![i] ?? -1),
          }));
          setForecast(rows);
        }
      } catch {
        /* offline / blocked — render clock only */
      }
    };
    load();
    const id = window.setInterval(load, 15 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [lat, lng]);

  // Locale convention: Brazilian Portuguese uses 24-hour (21:45:02),
  // US English uses 12-hour AM/PM (09:45:02 PM). Pinned to Brasília
  // regardless, since the zoneLabel below tells the viewer which tz
  // the numbers refer to.
  const timeStr = now
    ? now.toLocaleTimeString(pt ? "pt-BR" : "en-US", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: !pt,
      })
    : "--:--:--";

  // Editorial date format — NY-executive friendly in English,
  // natural Brazilian copy in pt. Finishes with an explicit Brasília
  // tz tag in both so there's no ambiguity.
  const dateStr = now
    ? pt
      ? (() => {
          const weekday = now.toLocaleDateString("pt-BR", {
            weekday: "long",
            timeZone: "America/Sao_Paulo",
          });
          const day = now.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "America/Sao_Paulo",
          });
          const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
          return `${cap(weekday)}, ${day}`;
        })()
      : now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "America/Sao_Paulo",
        })
    : "";

  const zoneLabel = pt ? "Hora de Brasília (UTC−3)" : "Brasília time (UTC−3)";

  // Per-day label. Today/Tomorrow get their own word; anything else
  // shows a short weekday abbreviation ("Wed" / "qua").
  const dayLabel = (iso: string, idx: number): string => {
    if (idx === 0) return pt ? "Hoje" : "Today";
    if (idx === 1) return pt ? "Amanhã" : "Tomorrow";
    const d = new Date(`${iso}T12:00:00-03:00`);
    const wd = d.toLocaleDateString(pt ? "pt-BR" : "en-US", {
      weekday: "short",
      timeZone: "America/Sao_Paulo",
    });
    return wd.charAt(0).toUpperCase() + wd.slice(1).replace(".", "");
  };

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      {/* Clock block — the hero's focal metadata */}
      <div className="min-w-0">
        <p
          aria-label="current time"
          className="font-mono text-[clamp(2.25rem,6vw,3.25rem)] font-bold leading-none tracking-tight tabular-nums bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent"
          style={{
            textShadow: "0 1px 32px rgba(167,139,250,0.35)",
          }}
        >
          {timeStr}
        </p>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {dateStr}
          <span className="ml-1 text-muted-foreground/70">· {zoneLabel}</span>
        </p>
      </div>

      {/* Weather block — 3-day forecast strip when we have coords +
          a successful fetch. Today carries the live current temp in
          the headline; the next two days show projected hi/lo. */}
      {forecast.length > 0 ? (
        <div className="flex items-stretch gap-2 self-end">
          {forecast.map((d, i) => {
            const isToday = i === 0;
            // Chip dimensions bumped ~40% (paddings, min-width, and
            // every font-size tier) so the forecast reads as a proper
            // card alongside the larger clock digits.
            return (
              <div
                key={d.date}
                className={`flex min-w-[96px] flex-col items-center rounded-2xl border px-4 py-3 text-center transition-colors ${
                  isToday
                    ? "border-violet-500/40 bg-gradient-to-b from-violet-500/10 to-transparent shadow-[0_0_22px_-6px_rgba(139,92,246,0.55)]"
                    : "border-border bg-background/40"
                }`}
              >
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dayLabel(d.date, i)}
                </p>
                {/* lucide icon in its semantic color (amber for
                    sun, slate for cloud, sky for rain, violet for
                    storms). Replaces the old emoji set with a
                    consistent vector-icon language matched to the
                    rest of the app. */}
                <span
                  aria-hidden
                  className="my-2 inline-flex h-9 w-9 items-center justify-center"
                  title={pt ? d.condition.pt : d.condition.en}
                >
                  <d.condition.Icon
                    className={`h-8 w-8 ${d.condition.color} drop-shadow-md`}
                    strokeWidth={1.75}
                  />
                </span>
                {isToday && weather ? (
                  <p className="text-[1.4rem] font-bold leading-none tabular-nums">
                    {weather.temperature}°
                  </p>
                ) : (
                  <p className="text-[1.125rem] font-semibold leading-none tabular-nums">
                    {d.hi}°
                  </p>
                )}
                <p className="mt-1 text-[13px] leading-none tabular-nums text-muted-foreground">
                  {d.lo}° / {d.hi}°
                </p>
              </div>
            );
          })}
          {label ? (
            <p className="self-end pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {label}
            </p>
          ) : null}
        </div>
      ) : lat != null && lng != null ? (
        <p className="self-end text-[11px] text-muted-foreground">
          {pt ? "carregando clima…" : "loading weather…"}
        </p>
      ) : null}
    </div>
  );
}
