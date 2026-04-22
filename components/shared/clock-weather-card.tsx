"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  /** City label shown in the meta line ("São Paulo, SP"). Optional. */
  label?: string | null;
  lat?: number | null;
  lng?: number | null;
}

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
 * Inline, futuristic clock + local-weather readout. Designed to sit
 * flush inside the welcome-hero card — no outer border, no gradient
 * background of its own, so the host container's styling shows
 * through. Visually the clock digits pick up a violet→pink gradient
 * to feel at home against the brand palette.
 *
 * Time-zone is pinned to America/Sao_Paulo (Brasília) — the dateline
 * below the clock says so in both locales so a viewer anywhere on
 * earth reading this at 3am PT isn't confused.
 */
export function ClockWeatherCard({ label, lat, lng }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherNow | null>(null);

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

  const cond = weather?.condition;

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      {/* Clock block — the hero's focal metadata */}
      <div className="min-w-0">
        <p
          aria-label="current time"
          className="font-mono text-[clamp(2.25rem,6vw,3.25rem)] font-light leading-none tracking-tight tabular-nums bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-transparent"
          style={{
            textShadow: "0 1px 32px rgba(167,139,250,0.25)",
          }}
        >
          {timeStr}
        </p>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {dateStr}
          <span className="ml-1 text-muted-foreground/70">· {zoneLabel}</span>
        </p>
      </div>

      {/* Weather block — only when we have coords + a successful fetch */}
      {cond && weather ? (
        <div className="flex items-center gap-3 self-end">
          <span
            aria-hidden
            className="text-[2.5rem] leading-none drop-shadow-xl"
            style={{
              filter: "drop-shadow(0 6px 14px rgba(167,139,250,0.35))",
            }}
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
            {label ? (
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {label}
              </p>
            ) : null}
          </div>
        </div>
      ) : lat != null && lng != null ? (
        <p className="self-end text-[11px] text-muted-foreground">
          {pt ? "carregando clima…" : "loading weather…"}
        </p>
      ) : null}
    </div>
  );
}
