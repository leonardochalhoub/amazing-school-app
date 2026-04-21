"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/context";
import type { CityPeoplePoint } from "@/lib/actions/teachers-map";

// Plotly is heavy and client-only — dynamic import with ssr:false
// so it never enters the server bundle and only loads when a user
// actually opens /owner/sysadmin. We pair the geo-only plotly bundle
// (~1.2MB vs 3MB+ for full plotly) via the factory pattern so the
// chunk only carries the modules scattergeo actually needs.
const Plot = dynamic(
  async () => {
    const [{ default: createPlotlyComponent }, plotlyModule] = await Promise.all([
      import("react-plotly.js/factory"),
      import("plotly.js-geo-dist-min"),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Plotly = (plotlyModule as any).default ?? plotlyModule;
    return createPlotlyComponent(Plotly) as unknown as React.ComponentType<
      Record<string, unknown>
    >;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center text-xs text-muted-foreground">
        carregando mapa…
      </div>
    ),
  },
);

interface Props {
  points: CityPeoplePoint[];
}

/**
 * Sequential palettes — monotonic so brighter/smaller → darker/bigger.
 *   · viridis : colorblind-safe (default)
 *   · blues   : classic single-hue ramp for viewers who prefer a
 *               simpler look
 */
const SCALES = {
  viridis: [
    [0, "#fde725"],
    [0.25, "#5ec962"],
    [0.5, "#21918c"],
    [0.75, "#3b528b"],
    [1, "#440154"],
  ] as [number, string][],
  blues: [
    [0, "#deebf7"],
    [0.25, "#9ecae1"],
    [0.5, "#4292c6"],
    [0.75, "#2171b5"],
    [1, "#08306b"],
  ] as [number, string][],
};

type ScaleKey = keyof typeof SCALES;
type FilterKey = "all" | "teachers" | "students";

export function BrazilTeachersMap({ points }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [scale, setScale] = useState<ScaleKey>("viridis");
  const [filter, setFilter] = useState<FilterKey>("all");

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
        text: filtered.map((p) => {
          const header = `<b>${p.name} · ${p.uf}</b>`;
          if (pt) {
            const rows: string[] = [];
            if (p.teachers > 0)
              rows.push(
                `${p.teachers} ${p.teachers === 1 ? "professor" : "professores"}`,
              );
            if (p.students > 0)
              rows.push(
                `${p.students} ${p.students === 1 ? "aluno" : "alunos"}`,
              );
            return `${header}<br>${rows.join("<br>")}`;
          }
          const rows: string[] = [];
          if (p.teachers > 0)
            rows.push(
              `${p.teachers} ${p.teachers === 1 ? "teacher" : "teachers"}`,
            );
          if (p.students > 0)
            rows.push(
              `${p.students} ${p.students === 1 ? "student" : "students"}`,
            );
          return `${header}<br>${rows.join("<br>")}`;
        }),
        hoverinfo: "text" as const,
        marker: {
          size: sizes,
          color: filtered.map((p) => p.value),
          colorscale: SCALES[scale],
          cmin: 1,
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
          },
        },
      },
    ];
  }, [filtered, scale, pt, filter]);

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
        lonaxis: { range: [-75, -33] },
        lataxis: { range: [-34, 6] },
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
    [],
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
            {pt ? "Pessoas pelo Brasil" : "People across Brazil"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {pt
              ? `${totals.teachers} ${totals.teachers === 1 ? "professor" : "professores"} · ${totals.students} ${totals.students === 1 ? "aluno" : "alunos"} · ${totals.cities} ${totals.cities === 1 ? "cidade" : "cidades"} · passe o mouse para detalhes.`
              : `${totals.teachers} ${totals.teachers === 1 ? "teacher" : "teachers"} · ${totals.students} ${totals.students === 1 ? "student" : "students"} · ${totals.cities} ${totals.cities === 1 ? "city" : "cities"} · hover for details.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Role filter */}
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
          {/* Palette toggle */}
          <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setScale("viridis")}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                scale === "viridis"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={
                pt ? "Paleta segura para daltônicos" : "Colorblind-safe palette"
              }
            >
              {pt ? "Daltônico" : "Colorblind-safe"}
            </button>
            <button
              type="button"
              onClick={() => setScale("blues")}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                scale === "blues"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={pt ? "Tons de azul" : "Single-hue blues"}
            >
              {pt ? "Azul simples" : "Simple blues"}
            </button>
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
