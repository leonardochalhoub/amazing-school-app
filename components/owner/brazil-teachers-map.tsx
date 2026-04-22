"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/context";
import type {
  CityPeoplePoint,
  CityPerson,
} from "@/lib/actions/teachers-map";

/**
 * Pin-color policy: male and female palettes are disjoint, so no
 * man ever gets a feminine tone and vice-versa. Unknown gender
 * falls back to neutral violet.
 */
const MALE_COLORS = [
  "#1d4ed8",
  "#0e7490",
  "#0284c7",
  "#4338ca",
  "#0891b2",
  "#1e40af",
  "#14b8a6",
  "#155e75",
];
const FEMALE_COLORS = [
  "#db2777",
  "#be185d",
  "#c026d3",
  "#9d174d",
  "#e11d48",
  "#a21caf",
  "#f472b6",
  "#f43f5e",
];
const NEUTRAL_COLORS = ["#7c3aed", "#a78bfa"];

function roleLabel(p: CityPerson, pt: boolean): string {
  if (p.role === "teacher") {
    if (!pt) return "Teacher";
    return p.gender === "female" ? "Professora" : "Professor";
  }
  if (!pt) return "Student";
  return p.gender === "female" ? "Aluna" : "Aluno";
}

/**
 * Smart bounds + jittered-pin coords used for both the "view.fitBounds"
 * call inside Leaflet and for computing a decent default centre/zoom.
 */
interface PersonMarker {
  lat: number;
  lng: number;
  color: string;
  name: string;
  role: string;
  city: string;
}

interface Props {
  points: CityPeoplePoint[];
  mode?: "owner" | "teacher";
}

type FilterKey = "all" | "teachers" | "students";

// Leaflet is a DOM-only library — dynamic import with ssr:false.
// We wrap everything into a single client component to sidestep
// Next.js's server-bundle warnings about `window`.
const LeafletMap = dynamic(() => import("./brazil-teachers-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center text-xs text-muted-foreground">
      carregando mapa…
    </div>
  ),
});

export function BrazilTeachersMap({ points, mode = "owner" }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [filter, setFilter] = useState<FilterKey>(
    mode === "teacher" ? "students" : "all",
  );

  const markers = useMemo<PersonMarker[]>(() => {
    const out: PersonMarker[] = [];
    let maleIdx = 0;
    let femaleIdx = 0;
    let neutralIdx = 0;
    for (const city of points) {
      const peopleInScope = city.people.filter((person) => {
        if (filter === "teachers") return person.role === "teacher";
        if (filter === "students") return person.role === "student";
        return true;
      });
      const count = peopleInScope.length;
      peopleInScope.forEach((person, i) => {
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
        out.push({
          lat,
          lng,
          color,
          name: person.name,
          role: roleLabel(person, pt),
          city: `${city.name} · ${city.uf}`,
        });
      });
    }
    return out;
  }, [points, filter, pt]);

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

      <div className="overflow-hidden rounded-xl border border-border bg-[#13131c] shadow-sm">
        {markers.length === 0 ? (
          <div className="flex h-[480px] items-center justify-center text-sm text-muted-foreground">
            {pt
              ? "Nenhuma localização registrada para este filtro."
              : "No locations on record for this filter."}
          </div>
        ) : (
          <LeafletMap markers={markers} />
        )}
      </div>
    </section>
  );
}
