"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/auth/roles";
import { locateCity } from "@/lib/data/brazil-city-coords";

export interface CityPerson {
  name: string;
  role: "teacher" | "student";
  gender: "female" | "male" | null;
}

export interface CityPeoplePoint {
  name: string;
  uf: string;
  lat: number;
  lng: number;
  teachers: number;
  students: number;
  /** teachers + students — used for bubble size. */
  total: number;
  /** Actual people anchored to this city, surfaced in the tooltip. */
  people: CityPerson[];
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

  // Resolve the exclusion set up front — same rules as the login-log
  // panel: hide demo personas, hide the platform owner (Leo), and
  // hide every student Leo coaches. The map should only count real
  // third-party teachers and their own students.
  const OWNER_EMAIL = "leochalhoub@hotmail.com";
  const { data: authList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const excludedIds = new Set<string>();
  let ownerId: string | null = null;
  for (const u of authList?.users ?? []) {
    const email = (u.email ?? "").toLowerCase();
    if (email.startsWith("demo.")) excludedIds.add(u.id);
    if (email === OWNER_EMAIL) {
      excludedIds.add(u.id);
      ownerId = u.id;
    }
  }
  if (ownerId) {
    const { data: leoStudents } = await admin
      .from("roster_students")
      .select("auth_user_id")
      .eq("teacher_id", ownerId)
      .not("auth_user_id", "is", null);
    for (const r of (leoStudents ?? []) as { auth_user_id: string }[]) {
      if (r.auth_user_id) excludedIds.add(r.auth_user_id);
    }
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, role, gender, location")
    .in("role", ["teacher", "owner", "student"]);
  if (error || !data) return [];

  type Bucket = {
    name: string;
    uf: string;
    lat: number;
    lng: number;
    teachers: number;
    students: number;
    people: CityPerson[];
  };
  const buckets = new Map<string, Bucket>();

  for (const row of data as Array<{
    id: string;
    full_name: string | null;
    role: string | null;
    gender: string | null;
    location: string | null;
  }>) {
    if (excludedIds.has(row.id)) continue;
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
        people: [],
      };
      buckets.set(key, bucket);
    }
    const personRole: CityPerson["role"] =
      row.role === "student" ? "student" : "teacher";
    if (personRole === "teacher") bucket.teachers += 1;
    else bucket.students += 1;
    bucket.people.push({
      name: row.full_name ?? "—",
      role: personRole,
      gender:
        row.gender === "female" || row.gender === "male" ? row.gender : null,
    });
  }

  return [...buckets.values()]
    .map((b) => ({ ...b, total: b.teachers + b.students }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * Per-teacher version used on /teacher/admin. Only the signed-in
 * teacher's own students are plotted. The data structure matches
 * CityPeoplePoint so the same map component can render it — the
 * "teachers" bucket is always 0 in this mode; every point is a
 * student count.
 */
export async function getMyStudentsByCity(): Promise<CityPeoplePoint[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Pull roster rows the teacher owns that are linked to an auth
  // user — only linked students have a profiles.location to locate.
  const { data: roster } = await admin
    .from("roster_students")
    .select("auth_user_id")
    .eq("teacher_id", user.id)
    .is("deleted_at", null)
    .not("auth_user_id", "is", null);

  const studentIds = [
    ...new Set(
      ((roster ?? []) as { auth_user_id: string }[])
        .map((r) => r.auth_user_id)
        .filter(Boolean),
    ),
  ];
  if (studentIds.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, gender, location")
    .in("id", studentIds);

  type Bucket = {
    name: string;
    uf: string;
    lat: number;
    lng: number;
    students: number;
    people: CityPerson[];
  };
  const buckets = new Map<string, Bucket>();

  for (const row of (profiles ?? []) as Array<{
    id: string;
    full_name: string | null;
    gender: string | null;
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
        students: 0,
        people: [],
      };
      buckets.set(key, bucket);
    }
    bucket.students += 1;
    bucket.people.push({
      name: row.full_name ?? "—",
      role: "student",
      gender:
        row.gender === "female" || row.gender === "male" ? row.gender : null,
    });
  }

  return [...buckets.values()]
    .map((b) => ({ ...b, teachers: 0, total: b.students }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}
