import { Zap } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLevel, getXpForNextLevel } from "@/lib/gamification/engine";
import { BADGE_BY_TYPE } from "@/lib/gamification/config";
import { T } from "@/components/reports/t";

/**
 * Compact teacher-side XP readout: level + XP + progress bar on the
 * left, the latest N earned badge chips on the right with a link to
 * the full discovery page. Only rendered when the teacher has
 * xp_enabled=true (the caller gates it).
 *
 * Mirrors the student hero's progress math but in a low-profile
 * single-row shape so it slides above the dashboard KPIs without
 * dominating.
 */
interface Props {
  teacherId: string;
}

export async function TeacherXpStrip({ teacherId }: Props) {
  const admin = createAdminClient();

  const [xpRes, badgeRes] = await Promise.all([
    admin.from("xp_events").select("xp_amount").eq("student_id", teacherId).limit(50_000),
    admin
      .from("badges")
      .select("badge_type, earned_at")
      .eq("student_id", teacherId)
      .order("earned_at", { ascending: false })
      .limit(6),
  ]);

  const totalXp =
    (xpRes.data ?? []).reduce(
      (s: number, r: { xp_amount: number }) => s + (r.xp_amount ?? 0),
      0,
    ) ?? 0;
  const level = getLevel(totalXp);
  const { current, needed, progress } = getXpForNextLevel(totalXp);
  const badges = (badgeRes.data ?? []) as Array<{
    badge_type: string;
    earned_at: string;
  }>;
  const pct = Math.max(0, Math.min(100, progress));

  return (
    <section
      aria-label="Teacher progress"
      className="relative overflow-hidden rounded-2xl border border-border p-5"
      style={{
        background:
          "radial-gradient(ellipse at top right, rgb(147 51 234 / 0.12), transparent 60%), radial-gradient(ellipse at bottom left, rgb(59 130 246 / 0.10), transparent 60%)",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {/* Two rows, stacked: XP bar up top, earned-badge chips below.
          The badges read as "your progress medals" sitting on the
          shelf directly under the XP bar — tighter visual grouping
          than the old side-by-side arrangement. */}
      <div className="relative flex flex-col gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-[11px] tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <T
                en={`Level ${level} · ${totalXp.toLocaleString("en-US")} XP`}
                pt={`Nível ${level} · ${totalXp.toLocaleString("pt-BR")} XP`}
              />
            </span>
            <span className="text-muted-foreground">
              <T
                en={`${Math.max(0, needed - current)} XP to Lv ${level + 1}`}
                pt={`Faltam ${Math.max(0, needed - current)} XP para o Nv ${level + 1}`}
              />
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border/60"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Earned-badge chips directly below the XP bar. "All
            badges" deep-link moved to /teacher/profile per UX
            feedback — keeps this strip visually clean. */}
        {badges.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {badges.map((b) => {
              const def = BADGE_BY_TYPE[b.badge_type];
              if (!def) return null;
              return (
                <span
                  key={b.badge_type}
                  title={def.name}
                  className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-br ${def.gradient} ${def.glow} px-2.5 py-1 text-[11px] font-semibold text-white`}
                >
                  <span aria-hidden>{def.icon}</span>
                  <span>{def.name}</span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            <T en="No badges yet — earn your first one below." pt="Ainda sem medalhas — conquiste a primeira abaixo." />
          </p>
        )}
      </div>
    </section>
  );
}
