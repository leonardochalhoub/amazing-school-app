"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/context";
import type {
  CityPeoplePoint,
  CityPerson,
} from "@/lib/actions/teachers-map";

/**
 * Hover-tooltip builder. Plotly keeps basic HTML so we lean on <b>,
 * <i> and <br> to give it structure. Output reads:
 *
 *   São Paulo · SP
 *   ───────────────
 *   4 pessoas
 *   2 profs · 2 alunos
 *   ───────────────
 *   Professores
 *     • Leonardo Chalhoub
 *     • Tatiana Sequeira
 *   Alunos
 *     • Ana Costa
 *
 * When the role filter is active we only render the relevant list.
 * Names are capped at 12 per role with "+ N a mais" to keep the box
 * reasonable for large cities.
 */
function roleLabel(p: CityPerson, pt: boolean): string {
  if (p.role === "teacher") {
    if (!pt) return "Teacher";
    return p.gender === "female" ? "Professora" : "Professor";
  }
  if (!pt) return "Student";
  return p.gender === "female" ? "Aluna" : "Aluno";
}

// Plotly is heavy and client-only — dynamic import with ssr:false
// so it never enters the server bundle and only loads when a user
// actually opens /owner/sysadmin. Using the default react-plotly.js
// which pulls in plotly.js — the geo bundle factory pattern had
// initialization issues with certain Next.js + React 19 combos, and
// the full bundle loads reliably. A ~700KB difference on a
// rarely-visited owner surface is an acceptable trade.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Plot = dynamic(() => import("react-plotly.js") as any, {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center text-xs text-muted-foreground">
      carregando mapa…
    </div>
  ),
}) as React.ComponentType<Record<string, unknown>>;

interface Props {
  points: CityPeoplePoint[];
  /**
   * - "owner" shows the full toggle set (All / Teachers / Students)
   *   and the page title mentions both roles.
   * - "teacher" hides the role filter, fixes view to students only,
   *   and retitles the section to "Seus alunos pelo Brasil".
   */
  mode?: "owner" | "teacher";
}

/**
 * Smart bounds: zoom in when every point fits a small region, fall
 * back to the whole Brazil box when the cluster spans the country.
 * Padding scales with the cluster size so single-city views get a
 * comfortable 2° halo while multi-state views keep their spacing.
 */
const BRAZIL_BOUNDS = {
  lon: [-75, -33] as [number, number],
  lat: [-34, 6] as [number, number],
};

function computeBounds(points: { lat: number; lng: number }[]): {
  lon: [number, number];
  lat: [number, number];
} {
  if (points.length === 0) return BRAZIL_BOUNDS;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const latSpread = maxLat - minLat;
  const lngSpread = maxLng - minLng;
  // If the cluster already covers most of Brazil just use the full
  // box — tighter framing wouldn't help and would push pins to the
  // edges.
  if (latSpread > 25 || lngSpread > 25) return BRAZIL_BOUNDS;
  // Single-point or ultra-tight cluster → enforce a minimum ~2.5°
  // halo in each direction so the pin doesn't sit on the very edge.
  const latPad = Math.max(1.5, latSpread * 0.35);
  const lngPad = Math.max(2.5, lngSpread * 0.35);
  // Clamp to Brazil so a coastal city doesn't zoom out into the
  // Atlantic beyond the country outline.
  const clampLat = (v: number) => Math.max(-34, Math.min(6, v));
  const clampLng = (v: number) => Math.max(-75, Math.min(-33, v));
  return {
    lon: [clampLng(minLng - lngPad), clampLng(maxLng + lngPad)],
    lat: [clampLat(minLat - latPad), clampLat(maxLat + latPad)],
  };
}

/**
 * Sequential palettes — every one monotonic, bright → dark as the
 * count grows.
 *   · viridis   : colorblind-safe (yellow → dark violet)
 *   · grayscale : white → black
 *   · greens    : white → dark green
 *   · reds      : white → dark red (magma-ish)
 */
/**
 * Pins are now per-person, colour-coded by gender. Men never receive
 * a colour from the feminine palette and vice-versa — the two sets
 * are deliberately disjoint. Each set has enough entries to visually
 * separate several people in the same city before cycling.
 */
const MALE_COLORS = [
  "#1d4ed8", // royal blue
  "#0e7490", // teal
  "#0284c7", // sky
  "#4338ca", // indigo
  "#0891b2", // cyan-700
  "#1e40af", // navy
  "#14b8a6", // emerald-teal
  "#155e75", // deep teal
];
const FEMALE_COLORS = [
  "#db2777", // rose
  "#be185d", // deep pink
  "#c026d3", // fuchsia
  "#9d174d", // burgundy
  "#e11d48", // rose-red
  "#a21caf", // magenta
  "#f472b6", // pink-400
  "#f43f5e", // rose-red-lighter
];
// When gender is unknown on the profile, fall back to neutral purple
// tones — visually distinct from both male/female palettes.
const NEUTRAL_COLORS = ["#7c3aed", "#a78bfa"];
type FilterKey = "all" | "teachers" | "students";

interface PersonMarker {
  lat: number;
  lng: number;
  color: string;
  size: number;
  tooltip: string;
}

export function BrazilTeachersMap({ points, mode = "owner" }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [filter, setFilter] = useState<FilterKey>(
    mode === "teacher" ? "students" : "all",
  );

  // Apply role filter — if filter is teachers/students we only plot
  // cities that actually have that role, and the bubble value
  // reflects only that count (so the colorbar stays meaningful).
  const filtered = useMemo(() => {
    if (filter === "all") return points.map((p) => ({ ...p, value: p.total }));
    if (filter === "teachers")
      return points
        .filter((p) => p.teachers > 0)
        .map((p) => ({ ...p, value: p.teachers }));
    return points
      .filter((p) => p.students > 0)
      .map((p) => ({ ...p, value: p.students }));
  }, [points, filter]);

  // Flatten every city bucket into one marker per person. When a
  // city has more than one person we fan them on a small circle
  // around the city centre so they don't overlap into a single pin.
  const markers = useMemo<PersonMarker[]>(() => {
    const out: PersonMarker[] = [];
    let maleIdx = 0;
    let femaleIdx = 0;
    let neutralIdx = 0;
    for (const city of filtered) {
      const peopleInScope = city.people.filter((person) => {
        if (filter === "teachers") return person.role === "teacher";
        if (filter === "students") return person.role === "student";
        return true;
      });
      const count = peopleInScope.length;
      peopleInScope.forEach((person, i) => {
        // Jitter only when there's 2+ people — a lone pin stays
        // dead centre. Circle radius scales lightly with count so
        // big clusters spread a bit more but don't explode.
        let lat = city.lat;
        let lng = city.lng;
        if (count > 1) {
          const r = 0.18 + Math.min(0.35, count * 0.025);
          const angle = (i / count) * 2 * Math.PI;
          lat += r * Math.sin(angle);
          lng += r * Math.cos(angle);
        }
        let color: string;
        if (person.gender === "male") {
          color = MALE_COLORS[maleIdx % MALE_COLORS.length];
          maleIdx += 1;
        } else if (person.gender === "female") {
          color = FEMALE_COLORS[femaleIdx % FEMALE_COLORS.length];
          femaleIdx += 1;
        } else {
          color = NEUTRAL_COLORS[neutralIdx % NEUTRAL_COLORS.length];
          neutralIdx += 1;
        }
        const roleText = roleLabel(person, pt);
        const header = `<b>${person.name}</b> — <i>${roleText}</i>`;
        const locationLine = `${city.name} · ${city.uf}`;
        out.push({
          lat,
          lng,
          color,
          size: person.role === "teacher" ? 20 : 16,
          tooltip: `${header}<br><span style="color:rgba(167,139,250,0.85);">${locationLine}</span>`,
        });
      });
    }
    return out;
  }, [filtered, filter, pt]);

  const data = useMemo(() => {
    if (markers.length === 0) return [];
    return [
      {
        type: "scattergeo" as const,
        mode: "markers" as const,
        lon: markers.map((m) => m.lng),
        lat: markers.map((m) => m.lat),
        text: markers.map((m) => m.tooltip),
        hoverinfo: "text" as const,
        hoverlabel: {
          bgcolor: "rgba(19,19,28,0.95)",
          bordercolor: "rgba(167,139,250,0.35)",
          font: {
            family: "system-ui, -apple-system, sans-serif",
            size: 12,
            color: "#ecebff",
          },
          align: "left" as const,
        },
        marker: {
          size: markers.map((m) => m.size),
          color: markers.map((m) => m.color),
          line: { color: "#ecebff", width: 1.2 },
          opacity: 0.94,
          showscale: false,
        },
      },
    ];
  }, [markers]);

  const bounds = useMemo(() => computeBounds(markers), [markers]);

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: { t: 8, r: 8, b: 8, l: 8 },
      geo: {
        // Explicit mercator — we're framing a small slice of the
        // globe so the default orthographic projection looked blank.
        projection: { type: "mercator" as const },
        // Ranges win; no `scope` so Plotly doesn't clip/zoom twice.
        lonaxis: { range: bounds.lon },
        lataxis: { range: bounds.lat },
        showland: true,
        landcolor: "#1b1b26",
        showocean: true,
        oceancolor: "#0a0a12",
        showlakes: true,
        lakecolor: "#0a0a12",
        showcountries: true,
        countrycolor: "rgba(167,139,250,0.45)",
        countrywidth: 0.8,
        showsubunits: true,
        subunitcolor: "rgba(167,139,250,0.25)",
        subunitwidth: 0.6,
        showcoastlines: true,
        coastlinecolor: "rgba(167,139,250,0.35)",
        coastlinewidth: 0.6,
        showframe: false,
        bgcolor: "rgba(0,0,0,0)",
        resolution: 110 as const,
      },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {
        family: "system-ui, -apple-system, sans-serif",
        color: "#ecebff",
        size: 11,
      },
      showlegend: false,
    }),
    [bounds],
  );

  const totals = useMemo(() => {
    let t = 0;
    let s = 0;
    for (const p of points) {
      t += p.teachers;
      s += p.students;
    }
    return { teachers: t, students: s, cities: points.length };
  }, [points]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {mode === "teacher"
              ? pt
                ? "Seus alunos pelo Brasil"
                : "Your students across Brazil"
              : pt
                ? "Pessoas pelo Brasil"
                : "People across Brazil"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {mode === "teacher"
              ? pt
                ? `${totals.students} ${totals.students === 1 ? "aluno" : "alunos"} em ${totals.cities} ${totals.cities === 1 ? "cidade" : "cidades"} · passe o mouse para detalhes.`
                : `${totals.students} ${totals.students === 1 ? "student" : "students"} in ${totals.cities} ${totals.cities === 1 ? "city" : "cities"} · hover for details.`
              : pt
                ? `${totals.teachers} ${totals.teachers === 1 ? "professor" : "professores"} · ${totals.students} ${totals.students === 1 ? "aluno" : "alunos"} · ${totals.cities} ${totals.cities === 1 ? "cidade" : "cidades"} · passe o mouse para detalhes.`
                : `${totals.teachers} ${totals.teachers === 1 ? "teacher" : "teachers"} · ${totals.students} ${totals.students === 1 ? "student" : "students"} · ${totals.cities} ${totals.cities === 1 ? "city" : "cities"} · hover for details.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Role filter — only shown on owner/sysadmin map. */}
          {mode === "owner" ? (
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
              {(
                [
                  { k: "all", en: "Both", pt: "Todos" },
                  { k: "teachers", en: "Teachers", pt: "Professores" },
                  { k: "students", en: "Students", pt: "Alunos" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setFilter(opt.k)}
                  className={`rounded px-3 py-1 font-medium transition-colors ${
                    filter === opt.k
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pt ? opt.pt : opt.en}
                </button>
              ))}
            </div>
          ) : null}
          {/* Tiny legend chip — communicates the gender colour rule. */}
          <div className="inline-flex items-center gap-3 rounded-md border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: MALE_COLORS[0] }}
              />
              {pt ? "Masculino" : "Male"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: FEMALE_COLORS[0] }}
              />
              {pt ? "Feminino" : "Female"}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-[#13131c] p-2 shadow-sm">
        {markers.length === 0 ? (
          <div className="flex h-[480px] items-center justify-center text-sm text-muted-foreground">
            {pt
              ? "Nenhuma localização registrada para este filtro."
              : "No locations on record for this filter."}
          </div>
        ) : (
          <Plot
            data={data}
            layout={layout}
            config={{
              displaylogo: false,
              displayModeBar: false,
              responsive: true,
              scrollZoom: false,
            }}
            useResizeHandler
            style={{ width: "100%", height: "520px" }}
          />
        )}
      </div>
    </section>
  );
}
