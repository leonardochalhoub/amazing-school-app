import type { BadgeDefinition } from "./config";

/**
 * Teacher-only badge pack — 100 ladder achievements across every
 * measurable teacher action. Spread into BADGE_DEFINITIONS in
 * config.ts. SQL counterparts live in migration 063.
 *
 * Kept out-of-band so config.ts doesn't balloon past 600 lines.
 * The shapes here are the canonical BadgeDefinition — types are
 * compile-checked against the imported interface.
 */

// Shared gradient / glow presets — tuned for teacher aesthetic:
// indigo-violet-fuchsia for assignment/legacy, amber-orange for
// instructional output, emerald for human impact, crown-gold for
// endgame.
const LEGACY = "from-indigo-500 via-violet-600 to-fuchsia-600";
const ARTISAN = "from-amber-400 via-orange-500 to-red-600";
const IMPACT = "from-emerald-400 via-teal-500 to-cyan-600";
const MENTOR = "from-lime-400 via-green-500 to-emerald-600";
const TENURE = "from-sky-400 via-indigo-500 to-violet-600";
const GOLD = "from-yellow-300 via-amber-400 to-orange-500";
const CROWN = "from-yellow-300 via-amber-400 to-orange-500";
const STONE = "from-stone-400 via-neutral-500 to-slate-700";

const GLOW_LOW = "shadow-[0_0_22px_-6px_rgba(99,102,241,0.65)]";
const GLOW_MED = "shadow-[0_0_28px_-4px_rgba(139,92,246,0.85)]";
const GLOW_HIGH = "shadow-[0_0_34px_-2px_rgba(217,70,239,0.95)]";
const GLOW_CROWN = "shadow-[0_0_44px_0px_rgba(252,211,77,1)]";

/** Compact helper — every ladder badge uses the same shape. */
function L(
  type: string,
  name: string,
  description: string,
  icon: string,
  threshold: number,
  counter: string,
  tier: BadgeDefinition["tier"],
  rarity: BadgeDefinition["rarity"],
  gradient: string,
  glow: string,
  theme: BadgeDefinition["theme"] = "teacher_legacy",
): BadgeDefinition {
  return {
    type, name, description, icon,
    unlock: { kind: "count", counter, threshold },
    rarity, tier, audience: "teacher", theme,
    gradient, glow,
  };
}

export const TEACHER_BADGE_PACK_100: BadgeDefinition[] = [
  // ═══ Classes Taught (13) ═══════════════════════════════════════
  L("classes_3",    "First Trio",              "3 classes taught",    "🔔", 3,    "classes_taught", "easy",        "common",    LEGACY,  GLOW_LOW),
  L("classes_5",    "Five-Class Streak",       "5 classes taught",    "🔔", 5,    "classes_taught", "easy",        "common",    LEGACY,  GLOW_LOW),
  L("classes_15",   "Back in the Saddle",      "15 classes taught",   "🎯", 15,   "classes_taught", "medium",      "rare",      LEGACY,  GLOW_MED),
  L("classes_25",   "Veteran Instructor",      "25 classes taught",   "🎖️", 25,   "classes_taught", "medium",      "rare",      LEGACY,  GLOW_MED),
  L("classes_75",   "Quarter Battalion",       "75 classes taught",   "🛡️", 75,   "classes_taught", "medium_plus", "epic",      LEGACY,  GLOW_HIGH),
  L("classes_150",  "Roll of Honour",          "150 classes taught",  "📜", 150,  "classes_taught", "medium_plus", "epic",      LEGACY,  GLOW_HIGH),
  L("classes_200",  "Double Century",          "200 classes taught",  "🏆", 200,  "classes_taught", "hard",        "epic",      LEGACY,  GLOW_HIGH),
  L("classes_300",  "Professor's Mantle",      "300 classes taught",  "🧑‍🏫", 300, "classes_taught", "hard",        "legendary", LEGACY,  GLOW_HIGH),
  L("classes_500",  "Old Guard",               "500 classes taught",  "🏛️", 500,  "classes_taught", "hard",        "legendary", LEGACY,  GLOW_CROWN),
  L("classes_750",  "War Room Regular",        "750 classes taught",  "🧭", 750,  "classes_taught", "very_hard",   "legendary", CROWN,   GLOW_CROWN),
  L("classes_1000", "Thousand-Day War",        "1,000 classes taught","🗡️", 1000, "classes_taught", "very_hard",   "mythic",    CROWN,   GLOW_CROWN),
  L("classes_1500", "Marathon of Instruction", "1,500 classes taught","🏹", 1500, "classes_taught", "very_hard",   "mythic",    CROWN,   GLOW_CROWN),
  L("classes_5000", "Lecture Legend",          "5,000 classes taught","👑", 5000, "classes_taught", "very_hard",   "mythic",    CROWN,   GLOW_CROWN),

  // ═══ Hours Taught (live-class hours delivered) (12) ════════════
  // Backed by an "hours" unlock kind (source: "live"). Thresholds
  // in real hours — the DB uses v_live_minutes / 60 internally.
  { type: "hours_taught_1",    name: "First Taught Hour",        description: "1 hour of live classes delivered",    icon: "⏱️", unlock: { kind: "hours", source: "live", hours: 1 },    rarity: "common",    tier: "easy",        audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_LOW },
  { type: "hours_taught_5",    name: "Five-Hour Shift",          description: "5 hours of live classes delivered",   icon: "⏲️", unlock: { kind: "hours", source: "live", hours: 5 },    rarity: "common",    tier: "easy",        audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_LOW },
  { type: "hours_taught_10",   name: "Double Shift",             description: "10 hours of live classes delivered",  icon: "🕙", unlock: { kind: "hours", source: "live", hours: 10 },   rarity: "rare",      tier: "medium",      audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_MED },
  { type: "hours_taught_25",   name: "Quarter Hundred",          description: "25 hours of live classes delivered",  icon: "📊", unlock: { kind: "hours", source: "live", hours: 25 },   rarity: "rare",      tier: "medium",      audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_MED },
  { type: "hours_taught_40",   name: "Semester Donation",        description: "40 hours delivered — a full CEFR semester given", icon: "🎓", unlock: { kind: "hours", source: "live", hours: 40 }, rarity: "epic",      tier: "medium_plus", audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_HIGH },
  { type: "hours_taught_80",   name: "Academic Year Donated",    description: "80 hours delivered — one CEFR year",  icon: "📅", unlock: { kind: "hours", source: "live", hours: 80 },   rarity: "epic",      tier: "medium_plus", audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_HIGH },
  { type: "hours_taught_120",  name: "Three Semesters In",       description: "120 hours delivered",                 icon: "📚", unlock: { kind: "hours", source: "live", hours: 120 },  rarity: "epic",      tier: "hard",        audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_HIGH },
  { type: "hours_taught_200",  name: "Full Course Equivalent",   description: "200 hours delivered",                 icon: "🎒", unlock: { kind: "hours", source: "live", hours: 200 },  rarity: "legendary", tier: "hard",        audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_CROWN },
  { type: "hours_taught_300",  name: "Guided 300 Hours",         description: "300 hours delivered",                 icon: "🧭", unlock: { kind: "hours", source: "live", hours: 300 },  rarity: "legendary", tier: "hard",        audience: "teacher", theme: "teacher_artisan", gradient: ARTISAN, glow: GLOW_CROWN },
  { type: "hours_taught_500",  name: "Half a Thousand",          description: "500 hours delivered",                 icon: "🏛️", unlock: { kind: "hours", source: "live", hours: 500 },  rarity: "legendary", tier: "very_hard",   audience: "teacher", theme: "teacher_artisan", gradient: CROWN,   glow: GLOW_CROWN },
  { type: "hours_taught_750",  name: "Three-Quarter Mastery",    description: "750 hours delivered",                 icon: "🗝️", unlock: { kind: "hours", source: "live", hours: 750 },  rarity: "mythic",    tier: "very_hard",   audience: "teacher", theme: "teacher_artisan", gradient: CROWN,   glow: GLOW_CROWN },
  { type: "hours_taught_1000", name: "Thousand-Hour Sage",       description: "1,000 hours delivered",               icon: "🧙", unlock: { kind: "hours", source: "live", hours: 1000 }, rarity: "mythic",    tier: "very_hard",   audience: "teacher", theme: "teacher_artisan", gradient: CROWN,   glow: GLOW_CROWN },

  // ═══ Assignments Created — Master of Puppets at 5000 (12) ══════
  L("assigns_3",         "Three Pinned",       "3 assignments created",       "📋", 3,    "assignments_created", "easy",        "common",    LEGACY, GLOW_LOW),
  L("assigns_5",         "The Starter Set",    "5 assignments created",       "📋", 5,    "assignments_created", "easy",        "common",    LEGACY, GLOW_LOW),
  L("assigns_25",        "Twenty-Five Issued", "25 assignments created",      "🗂️", 25,   "assignments_created", "medium",      "rare",      LEGACY, GLOW_MED),
  L("assigns_75",        "Scroll Cabinet",     "75 assignments created",      "📚", 75,   "assignments_created", "medium",      "rare",      LEGACY, GLOW_MED),
  L("assigns_200",       "Two Hundred Tasks",  "200 assignments created",     "📘", 200,  "assignments_created", "medium_plus", "epic",      LEGACY, GLOW_HIGH),
  L("assigns_300",       "Quarterly Output",   "300 assignments created",     "📘", 300,  "assignments_created", "medium_plus", "epic",      LEGACY, GLOW_HIGH),
  L("assigns_750",       "Assignment Engine",  "750 assignments created",     "⚙️", 750,  "assignments_created", "hard",        "epic",      LEGACY, GLOW_HIGH),
  L("assigns_1000",      "Thousand Tasks",     "1,000 assignments created",   "🏭", 1000, "assignments_created", "hard",        "legendary", LEGACY, GLOW_CROWN),
  L("assigns_1500",      "Industrious",        "1,500 assignments created",   "🏗️", 1500, "assignments_created", "hard",        "legendary", LEGACY, GLOW_CROWN),
  L("assigns_2000",      "The Forge",          "2,000 assignments created",   "🔥", 2000, "assignments_created", "very_hard",   "legendary", LEGACY, GLOW_CROWN),
  L("assigns_3000",      "Three Thousand",     "3,000 assignments created",   "🏭", 3000, "assignments_created", "very_hard",   "mythic",    LEGACY, GLOW_CROWN),
  L("master_of_puppets", "Master of Puppets",  "5,000 assignments created — \"obey your master\"", "🎸", 5000, "assignments_created", "very_hard", "mythic", "from-red-600 via-rose-700 to-neutral-900", GLOW_CROWN),

  // ═══ Tenure — days since joined (9) ═══════════════════════════
  // Uses composite rather than a dedicated kind — the DB branch
  // checks (current_date - created_at::date). Icon: an ever-
  // growing sundial.
  { type: "tenure_30",   name: "Month One",         description: "30 days on the platform",   icon: "🌓", unlock: { kind: "composite", description: "30+ days since joining" },   rarity: "common",    tier: "easy",        audience: "teacher", theme: "teacher_legacy", gradient: TENURE, glow: GLOW_LOW },
  { type: "tenure_60",   name: "Two Moons",         description: "60 days on the platform",   icon: "🌕", unlock: { kind: "composite", description: "60+ days since joining" },   rarity: "common",    tier: "easy",        audience: "teacher", theme: "teacher_legacy", gradient: TENURE, glow: GLOW_LOW },
  { type: "tenure_90",   name: "Quarter Year",      description: "90 days on the platform",   icon: "🌙", unlock: { kind: "composite", description: "90+ days since joining" },   rarity: "rare",      tier: "medium",      audience: "teacher", theme: "teacher_legacy", gradient: TENURE, glow: GLOW_MED },
  { type: "tenure_180",  name: "Half-Year Vet",     description: "180 days on the platform",  icon: "☀️", unlock: { kind: "composite", description: "180+ days since joining" },  rarity: "rare",      tier: "medium",      audience: "teacher", theme: "teacher_legacy", gradient: TENURE, glow: GLOW_MED },
  { type: "tenure_365",  name: "One Year In",       description: "365 days on the platform",  icon: "🗓️", unlock: { kind: "composite", description: "365+ days since joining" },  rarity: "epic",      tier: "medium_plus", audience: "teacher", theme: "teacher_legacy", gradient: TENURE, glow: GLOW_HIGH },
  { type: "tenure_730",  name: "Two Years In",      description: "2 years on the platform",   icon: "🗓️", unlock: { kind: "composite", description: "730+ days since joining" },  rarity: "epic",      tier: "hard",        audience: "teacher", theme: "teacher_legacy", gradient: TENURE, glow: GLOW_HIGH },
  { type: "tenure_1095", name: "Third Anniversary", description: "3 years on the platform",   icon: "🎉", unlock: { kind: "composite", description: "1095+ days since joining" }, rarity: "legendary", tier: "hard",        audience: "teacher", theme: "teacher_legacy", gradient: TENURE, glow: GLOW_CROWN },
  { type: "tenure_1825", name: "Five-Year Tenure",  description: "5 years on the platform",   icon: "🏆", unlock: { kind: "composite", description: "1825+ days since joining" }, rarity: "legendary", tier: "very_hard",   audience: "teacher", theme: "teacher_legacy", gradient: CROWN,  glow: GLOW_CROWN },
  { type: "tenure_3650", name: "Decade of Teaching", description: "10 years on the platform", icon: "🕰️", unlock: { kind: "composite", description: "3650+ days since joining" }, rarity: "mythic",    tier: "very_hard",   audience: "teacher", theme: "teacher_legacy", gradient: CROWN,  glow: GLOW_CROWN },

  // ═══ Lessons Authored (11) ═════════════════════════════════════
  L("authored_3",    "Three Published",    "3 authored lessons",    "🖋️", 3,    "lessons_authored", "easy",        "common",    ARTISAN, GLOW_LOW,  "teacher_artisan"),
  L("authored_10",   "First Textbook Shelf", "10 authored lessons", "📕", 10,   "lessons_authored", "medium",      "rare",      ARTISAN, GLOW_MED,  "teacher_artisan"),
  L("authored_15",   "Fifteen Lessons",    "15 authored lessons",   "📖", 15,   "lessons_authored", "medium",      "rare",      ARTISAN, GLOW_MED,  "teacher_artisan"),
  L("authored_50",   "Syllabus Builder",   "50 authored lessons",   "📙", 50,   "lessons_authored", "medium_plus", "epic",      ARTISAN, GLOW_HIGH, "teacher_artisan"),
  L("authored_75",   "Prolific Author",    "75 authored lessons",   "📚", 75,   "lessons_authored", "medium_plus", "epic",      ARTISAN, GLOW_HIGH, "teacher_artisan"),
  L("authored_100",  "Centennial Scribe",  "100 authored lessons",  "📘", 100,  "lessons_authored", "hard",        "epic",      ARTISAN, GLOW_HIGH, "teacher_artisan"),
  L("authored_150",  "Bookshelf Filled",   "150 authored lessons",  "📚", 150,  "lessons_authored", "hard",        "legendary", ARTISAN, GLOW_CROWN, "teacher_artisan"),
  L("authored_200",  "Two-Hundred Quill",  "200 authored lessons",  "🪶", 200,  "lessons_authored", "hard",        "legendary", ARTISAN, GLOW_CROWN, "teacher_artisan"),
  L("authored_300",  "Canon of 300",       "300 authored lessons",  "📖", 300,  "lessons_authored", "very_hard",   "legendary", ARTISAN, GLOW_CROWN, "teacher_artisan"),
  L("authored_500",  "Library of Leo",     "500 authored lessons",  "🏛️", 500,  "lessons_authored", "very_hard",   "mythic",    CROWN,   GLOW_CROWN, "teacher_artisan"),
  L("authored_1000", "Thousand-Lesson Legacy", "1,000 authored lessons", "📚", 1000, "lessons_authored", "very_hard", "mythic", CROWN, GLOW_CROWN, "teacher_artisan"),

  // ═══ Students Added — "She's a Mother" at 30 (9) ══════════════
  L("students_3",    "First Three",         "3 students added",                            "🌱", 3,   "students_added", "easy",        "common",    MENTOR, GLOW_LOW),
  L("students_5",    "Small Cohort",        "5 students added",                            "🌿", 5,   "students_added", "easy",        "common",    MENTOR, GLOW_LOW),
  L("students_15",   "Fifteen Apprentices", "15 students added",                           "🧑‍🎓", 15, "students_added", "medium",      "rare",      MENTOR, GLOW_MED),
  L("students_25",   "Full Class",          "25 students added",                           "👥", 25,  "students_added", "medium",      "rare",      MENTOR, GLOW_MED),
  L("shes_a_mother", "She's a Mother",      "30 students added — \"she's a mother\"",        "🤱", 30,  "students_added", "medium_plus", "epic",      "from-pink-400 via-rose-500 to-fuchsia-600", GLOW_HIGH),
  L("students_75",   "Busy Teacher",        "75 students added",                           "👨‍👩‍👧", 75, "students_added", "medium_plus", "epic",      MENTOR, GLOW_HIGH),
  L("students_150",  "Big Roster",          "150 students added",                          "📋", 150, "students_added", "hard",        "legendary", MENTOR, GLOW_CROWN),
  L("students_200",  "Full School",         "200 students added",                          "🏫", 200, "students_added", "hard",        "legendary", MENTOR, GLOW_CROWN),
  L("students_500",  "Five Hundred Served", "500 students added",                          "🏛️", 500, "students_added", "very_hard",   "mythic",    CROWN,  GLOW_CROWN),

  // ═══ Students Certified (8) ════════════════════════════════════
  L("certified_1",   "First Diploma Issued",    "1 student certified",   "🎓", 1,   "students_certified", "easy",        "rare",      IMPACT, GLOW_LOW,  "teacher_legacy"),
  L("certified_3",   "Triple Graduation",       "3 students certified",  "🎓", 3,   "students_certified", "medium",      "rare",      IMPACT, GLOW_MED,  "teacher_legacy"),
  L("certified_5",   "Small Graduating Class",  "5 students certified",  "🎓", 5,   "students_certified", "medium",      "epic",      IMPACT, GLOW_MED,  "teacher_legacy"),
  L("certified_15",  "Fifteen Certified",       "15 students certified", "🎓", 15,  "students_certified", "medium_plus", "epic",      IMPACT, GLOW_HIGH, "teacher_legacy"),
  L("certified_50",  "Fifty Alumni",            "50 students certified", "🏅", 50,  "students_certified", "hard",        "legendary", IMPACT, GLOW_CROWN, "teacher_legacy"),
  L("certified_75",  "Graduation Day",          "75 students certified", "🏛️", 75,  "students_certified", "hard",        "legendary", IMPACT, GLOW_CROWN, "teacher_legacy"),
  L("certified_100", "Century of Certified",    "100 students certified","🏆", 100, "students_certified", "very_hard",   "mythic",    CROWN,  GLOW_CROWN, "teacher_legacy"),
  L("certified_250", "Alumni Association",      "250 students certified","🎖️", 250, "students_certified", "very_hard",   "mythic",    CROWN,  GLOW_CROWN, "teacher_legacy"),

  // ═══ Certificates Issued (6) ═══════════════════════════════════
  L("certs_3",   "Triple Seal",    "3 certificates issued",   "📜", 3,   "certificates_issued", "easy",        "rare",      ARTISAN, GLOW_LOW,  "teacher_artisan"),
  L("certs_5",   "Quintuple Seal", "5 certificates issued",   "📜", 5,   "certificates_issued", "medium",      "rare",      ARTISAN, GLOW_MED,  "teacher_artisan"),
  L("certs_25",  "Seal Bearer",    "25 certificates issued",  "📜", 25,  "certificates_issued", "medium_plus", "epic",      ARTISAN, GLOW_HIGH, "teacher_artisan"),
  L("certs_75",  "Parchment Priest", "75 certificates issued", "📜", 75,  "certificates_issued", "hard",        "epic",      ARTISAN, GLOW_HIGH, "teacher_artisan"),
  L("certs_200", "Scroll Factory", "200 certificates issued", "🏭", 200, "certificates_issued", "hard",        "legendary", ARTISAN, GLOW_CROWN, "teacher_artisan"),
  L("certs_500", "Archive Keeper", "500 certificates issued", "🗝️", 500, "certificates_issued", "very_hard",   "mythic",    CROWN,   GLOW_CROWN, "teacher_artisan"),

  // ═══ Classrooms Created (5) ════════════════════════════════════
  L("classrooms_2",  "Two Classrooms",    "2 classrooms created",  "🏫", 2,  "classrooms_created", "easy",        "common",    LEGACY, GLOW_LOW),
  L("classrooms_7",  "Seven Houses",      "7 classrooms created",  "🏘️", 7,  "classrooms_created", "medium_plus", "rare",      LEGACY, GLOW_MED),
  L("classrooms_10", "Ten-Room Academy",  "10 classrooms created", "🏛️", 10, "classrooms_created", "hard",        "epic",      LEGACY, GLOW_HIGH),
  L("classrooms_15", "Expanded Wing",     "15 classrooms created", "🏫", 15, "classrooms_created", "hard",        "epic",      LEGACY, GLOW_HIGH),
  L("classrooms_20", "Campus Builder",    "20 classrooms created", "🏢", 20, "classrooms_created", "very_hard",   "legendary", LEGACY, GLOW_CROWN),

  // ═══ Simultaneous active classrooms (5) ═══════════════════════
  // Uses composite — DB checks current count of non-deleted
  // classrooms (v_active_classrooms) against threshold.
  { type: "concur_classrooms_2",  name: "Multi-Room Teacher",    description: "Running 2 classrooms simultaneously",    icon: "🔀", unlock: { kind: "composite", description: "2+ active classrooms" },  rarity: "common",    tier: "easy",        audience: "teacher", theme: "teacher_legacy", gradient: LEGACY, glow: GLOW_LOW },
  { type: "concur_classrooms_3",  name: "Three at Once",         description: "Running 3 classrooms simultaneously",    icon: "🔀", unlock: { kind: "composite", description: "3+ active classrooms" },  rarity: "rare",      tier: "medium",      audience: "teacher", theme: "teacher_legacy", gradient: LEGACY, glow: GLOW_MED },
  { type: "concur_classrooms_5",  name: "Juggling Five",         description: "Running 5 classrooms simultaneously",    icon: "🤹", unlock: { kind: "composite", description: "5+ active classrooms" },  rarity: "epic",      tier: "medium_plus", audience: "teacher", theme: "teacher_legacy", gradient: LEGACY, glow: GLOW_HIGH },
  { type: "concur_classrooms_7",  name: "Seven-Star Conductor",  description: "Running 7 classrooms simultaneously",    icon: "🎼", unlock: { kind: "composite", description: "7+ active classrooms" },  rarity: "legendary", tier: "hard",        audience: "teacher", theme: "teacher_legacy", gradient: LEGACY, glow: GLOW_CROWN },
  { type: "concur_classrooms_10", name: "Ten-Room Live",         description: "Running 10 classrooms simultaneously",   icon: "🎭", unlock: { kind: "composite", description: "10+ active classrooms" }, rarity: "mythic",    tier: "very_hard",   audience: "teacher", theme: "teacher_legacy", gradient: CROWN,  glow: GLOW_CROWN },

  // ═══ Concurrent active students (4) ════════════════════════════
  { type: "concur_students_5",  name: "Five Students Live",              description: "5 active students at once",                         icon: "👥", unlock: { kind: "composite", description: "5+ active students" },  rarity: "common",    tier: "easy",        audience: "teacher", theme: "teacher_legacy", gradient: MENTOR, glow: GLOW_LOW },
  { type: "concur_students_15", name: "Fifteen Live",                    description: "15 active students at once",                        icon: "👥", unlock: { kind: "composite", description: "15+ active students" }, rarity: "rare",      tier: "medium",      audience: "teacher", theme: "teacher_legacy", gradient: MENTOR, glow: GLOW_MED },
  { type: "concur_students_30", name: "Full Classroom — Can They Hear?", description: "30 active students at once",                        icon: "📣", unlock: { kind: "composite", description: "30+ active students" }, rarity: "epic",      tier: "medium_plus", audience: "teacher", theme: "teacher_legacy", gradient: MENTOR, glow: GLOW_HIGH },
  { type: "concur_students_50", name: "Lecture Hall",                    description: "50 active students at once",                        icon: "🏛️", unlock: { kind: "composite", description: "50+ active students" }, rarity: "legendary", tier: "hard",        audience: "teacher", theme: "teacher_legacy", gradient: MENTOR, glow: GLOW_CROWN },

  // ═══ Mentor Grants (6) ═════════════════════════════════════════
  L("mentor_10",   "First Mentor Credit",     "10 mentor XP grants logged",    "⚜️", 10,   "mentor_grants", "easy",        "common",    MENTOR, GLOW_LOW),
  L("mentor_25",   "Twenty-Five Mentor Acts", "25 mentor XP grants logged",    "⚜️", 25,   "mentor_grants", "medium",      "rare",      MENTOR, GLOW_MED),
  L("mentor_50",   "Fifty Mentor Acts",       "50 mentor XP grants logged",    "⚜️", 50,   "mentor_grants", "medium_plus", "rare",      MENTOR, GLOW_MED),
  L("mentor_250",  "Tireless Mentor",         "250 mentor XP grants logged",   "⚜️", 250,  "mentor_grants", "hard",        "epic",      MENTOR, GLOW_HIGH),
  L("mentor_500",  "Mentor Machine",          "500 mentor XP grants logged",   "⚜️", 500,  "mentor_grants", "hard",        "legendary", MENTOR, GLOW_CROWN),
  L("mentor_1000", "Hall of Mentors",         "1,000 mentor XP grants logged", "🏛️", 1000, "mentor_grants", "very_hard",   "mythic",    CROWN,  GLOW_CROWN),
];

// Reference to make TS happy about the STONE import since we
// pre-declared it but didn't end up using it; keeps tree-shaking
// neutral and means removing an import later is a one-char edit.
export const _TEACHER_PACK_INTERNAL_STONE = STONE;
