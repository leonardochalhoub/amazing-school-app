"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronDown, UserCog } from "lucide-react";
import { signOutStay } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { BrandMark } from "@/components/layout/brand-mark";
import {
  CartoonAvatar,
  type AgeGroup,
  type Gender,
} from "@/components/shared/cartoon-avatar";
import { cn } from "@/lib/utils";

interface NavbarProps {
  fullName: string;
  role: "teacher" | "student";
  avatarUrl?: string | null;
  isOwner?: boolean;
  userId: string;
  ageGroup?: AgeGroup | null;
  gender?: Gender | null;
  /** Optional white-label school logo shown centered above the nav. */
  schoolLogoPath?: string | null;
}

export function Navbar({
  fullName,
  role,
  avatarUrl,
  isOwner,
  schoolLogoPath,
  userId,
  ageGroup,
  gender,
}: NavbarProps) {
  const { locale } = useI18n();
  const pathname = usePathname();

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isFemale = gender === "female";
  const labels =
    locale === "pt-BR"
      ? {
          dashboard: "Painel",
          lessons: "Lições",
          music: "Músicas",
          aiTutor: "Tutor IA",
          leaderboard: "Ranking",
          profile: "Perfil",
          classrooms: "Turmas",
          speakingLab: "Lab de Fala",
          badges: "Medalhas",
          signedInAs: "Conectado como",
          signOut: "Sair",
          teacher: isFemale ? "Professora" : "Professor",
          student: isFemale ? "Aluna" : "Aluno",
        }
      : {
          dashboard: "Dashboard",
          lessons: "Lessons",
          music: "Songs",
          aiTutor: "AI Tutor",
          leaderboard: "Leaderboard",
          profile: "Profile",
          classrooms: "Classrooms",
          speakingLab: "Speaking Lab",
          badges: "Badges",
          signedInAs: "Signed in as",
          signOut: "Sign out",
          teacher: "Teacher",
          student: "Student",
        };

  // Students see a minimal nav — only surfaces that act on assignments
  // sent to them. No lessons catalog (they only consume what was assigned;
  // the per-lesson page at /student/lessons/[slug] is still reachable via
  // deep link). Music catalog stays so they can revisit assigned songs.
  // Profile link lives only in the avatar dropdown — no dedicated tab
  // in the main student nav. Music catalog stays since students revisit
  // assigned songs there.
  const studentNav = [
    { href: "/student", label: labels.dashboard },
    { href: "/student/music", label: labels.music },
    { href: "/speaking-lab", label: labels.speakingLab },
    { href: "/student/chat", label: labels.aiTutor },
    { href: "/student/badges", label: labels.badges },
  ];

  const teacherNav: { href: string; label: string }[] = [
    { href: "/teacher", label: labels.dashboard },
    { href: "/teacher/lessons", label: labels.lessons },
    { href: "/teacher/music", label: labels.music },
    { href: "/speaking-lab", label: labels.speakingLab },
    {
      href: "/teacher/bank",
      label: locale === "pt-BR" ? "Banco" : "Bank",
    },
    { href: "/teacher/chat", label: labels.aiTutor },
    { href: "/teacher/badges", label: labels.badges },
    { href: "/teacher/admin", label: locale === "pt-BR" ? "Gestão" : "Management" },
  ];
  if (isOwner) {
    teacherNav.push({
      href: "/owner/sysadmin",
      label: locale === "pt-BR" ? "Sysadmin" : "Sysadmin",
    });
  }

  const nav = role === "teacher" ? teacherNav : studentNav;
  const showNav = nav.length > 0;

  const navPills = showNav ? (
    <nav className="hidden justify-center md:flex">
      <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/60 p-1 shadow-xs backdrop-blur">
        {nav.map((link) => {
          const isActive =
            link.href === `/${role}`
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.7)] ring-1 ring-white/20 dark:ring-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  ) : null;

  const rightControls = (
    <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5">
      <span
        className={cn(
          "hidden items-center gap-2 rounded-full border px-4 py-1 text-[15px] font-bold uppercase tracking-wider lg:inline-flex",
          role === "teacher"
            ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-700 shadow-[0_0_20px_-2px_rgba(16,185,129,0.8)] dark:text-emerald-300 presence-glow"
            : "border-border/70 bg-muted/30 text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            role === "teacher"
              ? "bg-emerald-500 shadow-[0_0_10px_2px_rgba(16,185,129,0.9)] presence-dot"
              : "bg-emerald-500",
          )}
        />
        {role === "teacher" ? labels.teacher : labels.student}
      </span>

      <LocaleToggle />
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background/50 pl-1 pr-2 transition-colors hover:bg-accent">
          {avatarUrl ? (
            <Avatar className="h-7 w-7 overflow-hidden">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : ageGroup || gender ? (
            <div className="h-7 w-7 overflow-hidden rounded-full bg-muted">
              <CartoonAvatar
                ageGroup={ageGroup ?? null}
                gender={gender ?? null}
                seed={userId}
                fullName={fullName}
              />
            </div>
          ) : (
            <Avatar className="h-7 w-7 overflow-hidden">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem disabled className="flex-col items-start gap-0">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {labels.signedInAs}
            </span>
            <span className="font-medium">{fullName}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              window.location.href =
                role === "teacher" ? "/teacher/profile" : "/student/profile";
            }}
            className="cursor-pointer"
          >
            <UserCog className="mr-2 h-4 w-4" />
            {labels.profile}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await signOutStay();
              window.location.href = "/";
            }}
            className="cursor-pointer text-red-600 focus:text-red-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {labels.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full overflow-x-clip border-b border-border/70 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div
        className={cn(
          "relative mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-2 px-3 md:px-6",
          // Row grows with the logo across breakpoints so the image
          // always has breathing room: h-10 mobile → h-12 sm → h-16
          // md → h-20 lg. Without a logo it stays the classic h-16.
          schoolLogoPath
            ? "min-h-16 py-2 sm:min-h-[4.5rem] md:min-h-[6rem] md:py-3 lg:min-h-[7rem]"
            : "h-16",
        )}
      >
        <Link
          href={`/${role}`}
          className="group flex shrink-0 items-center gap-2.5"
        >
          <BrandMark className="h-9 w-9" />
          <span className="hidden lg:flex lg:flex-col lg:leading-tight">
            <span
              className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-xl italic text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400"
              style={{ letterSpacing: "-0.015em" }}
            >
              Amazing School
            </span>
          </span>
        </Link>

        {/* Center: either the school logo (when set) OR the nav pills.
            The logo is absolutely positioned so it centers against the
            viewport, independent of how wide the brand + right-hand
            controls happen to be. `max-w-[45%]` + a sidebar-aware
            padding window prevents it from overlapping either cluster
            on narrow screens. */}
        {schoolLogoPath ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex max-w-[45%] items-center justify-center"
          >
            <img
              src={schoolLogoPath}
              alt="School logo"
              className="h-10 max-w-full w-auto object-contain sm:h-12 md:h-16 lg:h-20"
            />
          </div>
        ) : showNav ? (
          <div className="hidden flex-1 justify-center md:flex">{navPills}</div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        {/* Right controls — on desktop they sit inside the top row.
            On mobile with a school logo, they move to their own
            row below so they never overlap the centered logo. */}
        <div className={cn(schoolLogoPath ? "hidden md:flex" : "flex")}>
          {rightControls}
        </div>
      </div>

      {/* Mobile-only controls row: rendered only when a school logo is
          set, right-aligned so tapping works without fighting the
          absolutely-positioned logo above. */}
      {schoolLogoPath ? (
        <div className="mx-auto w-full max-w-7xl min-w-0 px-3 pb-2 md:hidden">
          {rightControls}
        </div>
      ) : null}

      {/* When a school logo is taking up the center of the top row, the
          nav pills get their own centered row right below so everything
          still fits comfortably on desktop. */}
      {schoolLogoPath && showNav ? (
        <div className="mx-auto hidden w-full max-w-7xl min-w-0 items-center justify-center px-3 pb-2 md:flex md:px-6">
          {navPills}
        </div>
      ) : null}

      {/* Mobile nav — wraps onto multiple rows instead of horizontal
          scroll so every item is reachable without sliding. */}
      {showNav ? (
        <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-clip px-3 pb-2 md:hidden">
          <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-1 rounded-2xl border border-border/70 bg-background/60 p-1.5 backdrop-blur">
            {nav.map((link) => {
              const isActive =
                link.href === `/${role}`
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 text-white shadow-[0_0_18px_-4px_rgba(139,92,246,0.65)] ring-1 ring-white/20 dark:ring-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
