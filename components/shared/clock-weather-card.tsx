"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { MapPin } from "lucide-react";

interface Props {
  /** City label used in the card ("São Paulo, SP"). Empty is fine. */
  label: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * WMO weather code → pretty label + emoji. Full table at
 * https://open-meteo.com/en/docs — condensed here to the groups
 * that actually occur in Brazil at surface level.
 */
interface Condition {
  emoji: string;
  pt: string;
  en: string;
}
function describe(code: number): Condition {
  if (code === 0) return { emoji: "☀️", pt: "Céu limpo", en: "Clear sky" };
  if (code === 1) return { emoji: "🌤️", pt: "Quase limpo", en: "Mostly clear" };
  if (code === 2)
    return { emoji: "⛅", pt: "Parcialmente nublado", en: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", pt: "Nublado", en: "Overcast" };
  if (code === 45 || code === 48)
    return { emoji: "🌫️", pt: "Neblina", en: "Fog" };
  if (code >= 51 && code <= 57)
    return { emoji: "🌦️", pt: "Garoa", en: "Drizzle" };
  if (code >= 61 && code <= 67)
    return { emoji: "🌧️", pt: "Chuva", en: "Rain" };
  if (code >= 71 && code <= 77)
    return { emoji: "❄️", pt: "Neve", en: "Snow" };
  if (code >= 80 && code <= 82)
    return { emoji: "🌧️", pt: "Pancadas de chuva", en: "Rain showers" };
  if (code >= 85 && code <= 86)
    return { emoji: "🌨️", pt: "Pancadas de neve", en: "Snow showers" };
  if (code === 95)
    return { emoji: "⛈️", pt: "Tempestade", en: "Thunderstorm" };
  if (code === 96 || code === 99)
    return { emoji: "⛈️", pt: "Tempestade com granizo", en: "Storm w/ hail" };
  return { emoji: "🌡️", pt: "Tempo indefinido", en: "Weather unknown" };
}

interface WeatherNow {
  temperature: number;
  condition: Condition;
}

/**
 * Compact card that shows the local live clock plus the current
 * temperature + sky condition for the student's / teacher's city.
 * Self-contained:
 *   - Clock ticks every second via setInterval (SSR-safe).
 *   - Weather fetched once on mount, then re-polled every 15 min
 *     (Open-Meteo updates its current-conditions payload hourly).
 *   - Gracefully renders clock-only when lat/lng are null or the
 *     API call fails — never swallows the time display.
 */
export function ClockWeatherCard({ label, lat, lng }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);

  // Live clock. Initialised after mount so there's no SSR mismatch.
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Weather fetch + refresh.
  useEffect(() => {
    if (lat == null || lng == null) return;
    let alive = true;
    const load = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as {
          current?: { temperature_2m?: number; weather_code?: number };
        };
        const t = json.current?.temperature_2m;
        const c = json.current?.weather_code;
        if (!alive || t == null || c == null) return;
        setWeather({ temperature: Math.round(t), condition: describe(c) });
      } catch {
        /* offline or blocked — render clock only */
      }
    };
    load();
    const id = window.setInterval(load, 15 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [lat, lng]);

  const timeStr = now
    ? now.toLocaleTimeString(pt ? "pt-BR" : "en-US", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--";
  const dateStr = now
    ? now.toLocaleDateString(pt ? "pt-BR" : "en-US", {
        timeZone: "America/Sao_Paulo",
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "";

  const cond = weather?.condition;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-pink-500/10 p-4 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-pink-500/20 blur-3xl"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        {/* Clock */}
        <div className="min-w-0">
          <p className="font-mono text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
            {timeStr}
          </p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {dateStr}
          </p>
          {label ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {label}
            </p>
          ) : null}
        </div>

        {/* Weather — only when we have a location + data */}
        {cond && weather ? (
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="text-4xl leading-none drop-shadow-lg"
              style={{ filter: "drop-shadow(0 4px 12px rgba(167,139,250,0.4))" }}
            >
              {cond.emoji}
            </span>
            <div className="text-right">
              <p className="text-2xl font-semibold leading-none tabular-nums">
                {weather.temperature}°C
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pt ? cond.pt : cond.en}
              </p>
            </div>
          </div>
        ) : lat != null && lng != null ? (
          <p className="text-[11px] text-muted-foreground">
            {pt ? "carregando clima…" : "loading weather…"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
