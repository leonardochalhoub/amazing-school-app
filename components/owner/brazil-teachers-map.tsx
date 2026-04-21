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
const NAME_LIMIT_PER_ROLE = 12;

function roleLabel(p: CityPerson, pt: boolean): string {
  if (p.role === "teacher") {
    if (!pt) return "Teacher";
    return p.gender === "female" ? "Professora" : "Professor";
  }
  if (!pt) return "Student";
  return p.gender === "female" ? "Aluna" : "Aluno";
}

function renderNameRows(
  people: CityPerson[],
  pt: boolean,
): string {
  const visible = people.slice(0, NAME_LIMIT_PER_ROLE);
  const extra = people.length - visible.length;
  const lines = visible.map(
    (p) => `&nbsp;&nbsp;• ${p.name} — <i>${roleLabel(p, pt)}</i>`,
  );
  if (extra > 0) {
    lines.push(
      pt
        ? `&nbsp;&nbsp;<i>+ ${extra} a mais</i>`
        : `&nbsp;&nbsp;<i>+ ${extra} more</i>`,
    );
  }
  return lines.join("<br>");
}

function buildTooltip(
  point: CityPeoplePoint,
  pt: boolean,
  filter: "all" | "teachers" | "students",
): string {
  const divider =
    '<span style="color:rgba(167,139,250,0.4);">──────────────</span>';
  const teachers = point.people.filter((p) => p.role === "teacher");
  const students = point.people.filter((p) => p.role === "student");

  const header = `<b>${point.name} · ${point.uf}</b>`;

  const visibleCount =
    filter === "teachers"
      ? point.teachers
      : filter === "students"
        ? point.students
        : point.total;

  const summary =
    filter === "all"
      ? pt
        ? `<b>${point.total} ${point.total === 1 ? "pessoa" : "pessoas"}</b><br>${
            point.teachers
          } ${point.teachers === 1 ? "professor(a)" : "professores"} · ${
            point.students
          } ${point.students === 1 ? "aluno(a)" : "alunos"}`
        : `<b>${point.total} ${point.total === 1 ? "person" : "people"}</b><br>${
            point.teachers
          } ${point.teachers === 1 ? "teacher" : "teachers"} · ${
            point.students
          } ${point.students === 1 ? "student" : "students"}`
      : pt
        ? `<b>${visibleCount} ${
            filter === "teachers"
              ? visibleCount === 1
                ? "professor(a)"
                : "professores"
              : visibleCount === 1
                ? "aluno(a)"
                : "alunos"
          }</b>`
        : `<b>${visibleCount} ${
            filter === "teachers"
              ? visibleCount === 1
                ? "teacher"
                : "teachers"
              : visibleCount === 1
                ? "student"
                : "students"
          }</b>`;

  const lists: string[] = [];
  if (filter !== "students" && teachers.length > 0) {
    lists.push(
      `<b>${pt ? "Professores" : "Teachers"}</b><br>${renderNameRows(
        teachers,
        pt,
      )}`,
    );
  }
  if (filter !== "teachers" && students.length > 0) {
    lists.push(
      `<b>${pt ? "Alunos" : "Students"}</b><br>${renderNameRows(
        students,
        pt,
      )}`,
    );
  }

  const segments = [header, divider, summary];
  if (lists.length > 0) {
    segments.push(divider, lists.join("<br>"));
  }
  return segments.join("<br>");
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
const SCALES = {
  // Cividis — bright yellow → dark blue. Colorblind-safe and
  // monotonic brightness → luminance, as requested.
  viridis: [
    [0, "#fee838"],
    [0.25, "#c3b369"],
    [0.5, "#707173"],
    [0.75, "#3b496c"],
    [1, "#00224e"],
  ] as [number, string][],
  grayscale: [
    [0, "#ffffff"],
    [0.5, "#888888"],
    [1, "#000000"],
  ] as [number, string][],
  greens: [
    [0, "#f7fcf5"],
    [0.25, "#c7e9c0"],
    [0.5, "#74c476"],
    [0.75, "#238b45"],
    [1, "#00441b"],
  ] as [number, string][],
  reds: [
    [0, "#fff5f0"],
    [0.25, "#fcbba1"],
    [0.5, "#fb6a4a"],
    [0.75, "#cb181d"],
    [1, "#67000d"],
  ] as [number, string][],
};

type ScaleKey = keyof typeof SCALES;
type FilterKey = "all" | "teachers" | "students";

export function BrazilTeachersMap({ points, mode = "owner" }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [scale, setScale] = useState<ScaleKey>("viridis");
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

  const data = useMemo(() => {
    if (filtered.length === 0) return [];
    const maxCount = Math.max(1, ...filtered.map((p) => p.value));
    const sizes = filtered.map(
      (p) => 14 + (p.value / maxCount) * 36,
    );
    return [
      {
        type: "scattergeo" as const,
        mode: "markers" as const,
        lon: filtered.map((p) => p.lng),
        lat: filtered.map((p) => p.lat),
        text: filtered.map((p) => buildTooltip(p, pt, filter)),
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
          size: sizes,
          color: filtered.map((p) => p.value),
          colorscale: SCALES[scale],
          cmin: 0,
          cmax: maxCount,
          line: { color: "rgba(10,10,18,0.45)", width: 1 },
          opacity: 0.92,
          colorbar: {
            title: {
              text: pt
                ? filter === "teachers"
                  ? "Profs."
                  : filter === "students"
                    ? "Alunos"
                    : "Total"
                : filter === "teachers"
                  ? "Teach."
                  : filter === "students"
                    ? "Stud."
                    : "Total",
              font: { size: 10 },
            },
            thickness: 10,
            len: 0.5,
            x: 1.02,
            y: 0.5,
            tickfont: { size: 9 },
            outlinewidth: 0,
            // Explicit integer ticks anchored at 0 → maxCount so the
            // colorbar always labels both endpoints (plus a midpoint
            // when the span is large enough).
            tickmode: "array" as const,
            tickvals:
              maxCount <= 2
                ? [0, maxCount]
                : maxCount <= 4
                  ? [0, Math.ceil(maxCount / 2), maxCount]
                  : [
                      0,
                      Math.round(maxCount / 4),
                      Math.round(maxCount / 2),
                      Math.round((3 * maxCount) / 4),
                      maxCount,
                    ],
            ticktext:
              maxCount <= 2
                ? ["0", String(maxCount)]
                : maxCount <= 4
                  ? ["0", String(Math.ceil(maxCount / 2)), String(maxCount)]
                  : [
                      "0",
                      String(Math.round(maxCount / 4)),
                      String(Math.round(maxCount / 2)),
                      String(Math.round((3 * maxCount) / 4)),
                      String(maxCount),
                    ],
            tickformat: "d",
          },
        },
      },
    ];
  }, [filtered, scale, pt, filter]);

  const bounds = useMemo(() => computeBounds(filtered), [filtered]);

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: { t: 8, r: 8, b: 8, l: 8 },
      geo: {
        scope: "south america" as const,
        resolution: 50,
        showcountries: true,
        countrycolor: "rgba(167,139,250,0.45)",
        showsubunits: true,
        subunitcolor: "rgba(167,139,250,0.22)",
        subunitwidth: 0.6,
        showland: true,
        landcolor: "#13131c",
        showocean: true,
        oceancolor: "#0a0a12",
        showlakes: true,
        lakecolor: "#0a0a12",
        showframe: false,
        lonaxis: { range: bounds.lon },
        lataxis: { range: bounds.lat },
        bgcolor: "rgba(0,0,0,0)",
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
          {/* Palette toggle — 4 scales. Viridis is the colorblind-safe
              default; the other three are single-hue ramps for
              viewers who prefer a simpler look. */}
          <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
            {(
              [
                {
                  k: "viridis",
                  en: "Colorblind-safe",
                  pt: "Daltônico",
                  hint: pt ? "Viridis · amarelo → violeta" : "Viridis",
                },
                {
                  k: "grayscale",
                  en: "B/W",
                  pt: "P/B",
                  hint: pt ? "Branco → preto" : "White → black",
                },
                {
                  k: "greens",
                  en: "Green",
                  pt: "Verde",
                  hint: pt ? "Branco → verde escuro" : "White → dark green",
                },
                {
                  k: "reds",
                  en: "Red",
                  pt: "Vermelho",
                  hint: pt ? "Branco → vermelho escuro" : "White → dark red",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.k}
                type="button"
                onClick={() => setScale(opt.k)}
                title={opt.hint}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  scale === opt.k
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pt ? opt.pt : opt.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-[#13131c] p-2 shadow-sm">
        {filtered.length === 0 ? (
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
