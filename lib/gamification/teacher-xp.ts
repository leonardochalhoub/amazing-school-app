import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { XP_REWARDS } from "./config";

/**
 * Teacher-side XP grant. Writes a single xp_events row with the
 * matching `source` value; the DB trigger installed by migration 060
 * re-evaluates the teacher's badge eligibility automatically, and
 * the award_eligible_badges function awards anything new.
 *
 * Every source value here matches the CHECK constraint in migration
 * 061 — if you add a new source, extend both.
 *
 * Returns silently on error: XP grants should never block the actual
 * user-facing mutation. We log and move on.
 */
export type TeacherXpSource =
  | "teacher_assign"
  | "teacher_author"
  | "teacher_music"
  | "teacher_schedule"
  | "teacher_teach"
  | "teacher_certify"
  | "teacher_polish"
  | "mentor_lesson"
  | "mentor_level"
  | "mentor_certify";

const AMOUNT_BY_SOURCE: Record<TeacherXpSource, number> = {
  teacher_assign: XP_REWARDS.TEACHER_ASSIGN,
  teacher_author: XP_REWARDS.TEACHER_AUTHOR,
  teacher_music: XP_REWARDS.TEACHER_MUSIC,
  teacher_schedule: XP_REWARDS.TEACHER_SCHEDULE,
  teacher_teach: XP_REWARDS.TEACHER_TEACH,
  teacher_certify: XP_REWARDS.TEACHER_CERTIFY,
  teacher_polish: XP_REWARDS.TEACHER_POLISH,
  mentor_lesson: XP_REWARDS.MENTOR_LESSON,
  mentor_level: XP_REWARDS.MENTOR_LEVEL,
  mentor_certify: XP_REWARDS.MENTOR_CERTIFY,
};

interface GrantOpts {
  /** Optional classroom to tag the event with. Null is fine for
   *  polish / authoring that isn't classroom-scoped. */
  classroomId?: string | null;
  /** Override the default amount. Rare — only for partial credit. */
  amount?: number;
}

export async function grantTeacherXp(
  teacherId: string | null | undefined,
  source: TeacherXpSource,
  opts: GrantOpts = {},
): Promise<void> {
  if (!teacherId) return;
  const amount = opts.amount ?? AMOUNT_BY_SOURCE[source];
  if (amount <= 0) return;

  const admin = createAdminClient();

  // Opt-in gate — teachers who haven't flipped the XP toggle on in
  // /teacher/profile skip all writes. xp_enabled only exists after
  // migration 062; on a fresh DB we treat missing as ON so grants
  // don't silently disappear. Flipping the flag is non-destructive.
  const { data: prof } = await admin
    .from("profiles")
    .select("role")
    .eq("id", teacherId)
    .maybeSingle();
  if (!prof) return;
  const isTeacher = (prof as { role?: string }).role === "teacher";
  if (isTeacher) {
    try {
      const { data: xpRow } = await admin
        .from("profiles")
        .select("xp_enabled")
        .eq("id", teacherId)
        .maybeSingle();
      const flag = (xpRow as { xp_enabled?: boolean | null } | null)?.xp_enabled;
      if (flag === false) return;
    } catch {
      /* column absent — migration not yet run — default ON */
    }
  }

  const { error } = await admin.from("xp_events").insert({
    student_id: teacherId,
    classroom_id: opts.classroomId ?? null,
    xp_amount: amount,
    source,
  });
  if (error) {
    console.error(`grantTeacherXp(${source}) error:`, error);
  }
}

/**
 * One-shot "polish" rewards — signature, logo, avatar, bio, location,
 * birthday. These are intended to be claimable exactly once per
 * teacher, so we dedupe by inspecting existing xp_events first.
 * Pass a stable sub-key via `polishKind` so "signature" and "bio"
 * grants don't collide with each other.
 */
export async function grantTeacherPolishOnce(
  teacherId: string | null | undefined,
  polishKind:
    | "signature"
    | "logo"
    | "avatar"
    | "bio"
    | "location"
    | "birthday",
): Promise<void> {
  if (!teacherId) return;
  const admin = createAdminClient();
  // The simplest dedupe we can rely on is an already-existing badge
  // for the matching polish flag — if it's present the teacher has
  // already claimed the XP. The polish badges are all tier=easy so
  // this happens at most once per flag per teacher.
  const flagToBadge: Record<typeof polishKind, string> = {
    signature: "teacher_signature",
    logo: "teacher_logo",
    avatar: "profile_avatar",
    bio: "profile_bio",
    location: "profile_location",
    birthday: "profile_birthday",
  };
  const { data: already } = await admin
    .from("badges")
    .select("student_id")
    .eq("student_id", teacherId)
    .eq("badge_type", flagToBadge[polishKind])
    .maybeSingle();
  if (already) return;
  await grantTeacherXp(teacherId, "teacher_polish");
}
