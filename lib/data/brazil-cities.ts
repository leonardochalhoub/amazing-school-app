/**
 * Brazilian municipalities (~5.5k) pre-baked from the IBGE API at
 * build time and shipped as a compact JSON under /public/data. The
 * static file loads from our own CDN in a few hundred ms, while
 * hitting IBGE directly from the browser took 2–5s on slower
 * connections and sometimes stalled entirely.
 *
 * The on-disk format is `[[name, uf], …]` to keep the payload small
 * (~120 KB / ~30 KB gzipped). In-memory we widen it back to objects
 * so call sites read naturally.
 */

export interface BrazilCity {
  name: string;
  /** Two-letter state code — SP, RJ, MG, etc. */
  uf: string;
}

const CACHE_KEY = "brazil_cities_v2";
const DATA_URL = "/data/brazil-cities.json";

/**
 * Returns the full municipality list. sessionStorage is tried first
 * so a second picker on the same page doesn't re-download. Never
 * throws — on failure returns an empty array so the picker falls
 * back to free-form input.
 */
export async function loadBrazilCities(): Promise<BrazilCity[]> {
  if (typeof window === "undefined") return [];
  try {
    const cached = window.sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as BrazilCity[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // sessionStorage can throw in private mode — just fall through.
  }
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) return [];
    const rows = (await res.json()) as [string, string][];
    const cities: BrazilCity[] = rows.map(([name, uf]) => ({ name, uf }));
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cities));
    } catch {
      // Quota error etc. — cache is optional.
    }
    return cities;
  } catch {
    return [];
  }
}

/** "São Paulo, SP" display string. */
export function formatCity(c: BrazilCity): string {
  return `${c.name}, ${c.uf}`;
}

/** Accent-insensitive, case-insensitive matcher. */
export function matchCity(city: BrazilCity, query: string): boolean {
  if (!query) return true;
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const q = norm(query);
  return norm(city.name).includes(q) || norm(city.uf).includes(q);
}
