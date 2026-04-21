"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";
import { locateCity } from "@/lib/data/brazil-city-coords";

export interface CityPeoplePoint {
  name: string;
  uf: string;
  lat: number;
  lng: number;
  teachers: number;
  students: number;
  /** teachers + students — used for bubble size. */
  total: number;
}

/**
 * Aggregates teacher + student counts per city for the sysadmin map.
 * Groups by (city, uf) and counts each role separately so the hover
 * tooltip can show the breakdown while the bubble size reflects the
 * combined presence in each city.
 *
 * Profiles whose `location` is empty or can't be resolved to a
 * Brazilian municipality are dropped silently. Owner-only.
 */
export async function getPeopleByCity(): Promise<CityPeoplePoint[]> {
  const ok = await isOwner();
  if (!ok) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, location")
    .in("role", ["teacher", "owner", "student"]);
  if (error || !data) return [];

  type Bucket = {
    name: string;
    uf: string;
    lat: number;
    lng: number;
    teachers: number;
    students: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const row of data as Array<{
    id: string;
    role: string | null;
    location: string | null;
  }>) {
    const coord = locateCity(row.location);
    if (!coord) continue;
    const key = `${coord.name.toLowerCase()}|${coord.uf.toUpperCase()}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        name: coord.name,
        uf: coord.uf,
        lat: coord.lat,
        lng: coord.lng,
        teachers: 0,
        students: 0,
      };
      buckets.set(key, bucket);
    }
    if (row.role === "teacher" || row.role === "owner") bucket.teachers += 1;
    else if (row.role === "student") bucket.students += 1;
  }

  return [...buckets.values()]
    .map((b) => ({ ...b, total: b.teachers + b.students }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}
