/**
 * Brazilian municipalities (~5,570) sourced from the public IBGE API.
 * Fetched client-side on first use and cached in sessionStorage so a
 * page reload doesn't re-hit the network.
 *
 * API: https://servicodados.ibge.gov.br/api/v1/localidades/municipios
 */

export interface BrazilCity {
  name: string;
  /** Two-letter state code — SP, RJ, MG, etc. */
  uf: string;
}

const CACHE_KEY = "brazil_cities_v1";
const IBGE_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome";

interface IbgeMunicipio {
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: { sigla?: string };
    };
  };
  // Newer IBGE responses sometimes surface the UF at a different nesting
  // (regiao-imediata). Captured here so the mapper can fall back safely.
  "regiao-imediata"?: {
    "regiao-intermediaria"?: {
      UF?: { sigla?: string };
    };
  };
}

function extractUf(m: IbgeMunicipio): string {
  return (
    m.microrregiao?.mesorregiao?.UF?.sigla ??
    m["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ??
    ""
  );
}

/**
 * Returns the full municipality list, hitting sessionStorage first and
 * the IBGE API only on cache miss. Never throws — on failure returns
 * an empty array so the picker falls back to free-form input.
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
    const res = await fetch(IBGE_URL);
    if (!res.ok) return [];
    const rows = (await res.json()) as IbgeMunicipio[];
    const cities: BrazilCity[] = rows
      .map((m) => ({ name: m.nome, uf: extractUf(m) }))
      .filter((c) => c.name && c.uf)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
