"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronDown, UserCog } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
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
import { cn } from "@/lib/utils";

interface NavbarProps {
  fullName: string;
  role: "teacher" | "student";
  avatarUrl?: string | null;
  isOwner?: boolean;
}

export function Navbar({ fullName, role, avatarUrl, isOwner }: NavbarProps) {
  const { locale } = useI18n();
  const pathname = usePathname();

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
          signedInAs: "Conectado como",
          signOut: "Sair",
          teacher: "Professor",
          student: "Aluno",
        }
      : {
          dashboard: "Dashboard",
          lessons: "Lessons",
          music: "Musics",
          aiTutor: "AI Tutor",
          leaderboard: "Leaderboard",
          profile: "Profile",
          classrooms: "Classrooms",
          signedInAs: "Signed in as",
          signOut: "Sign out",
          teacher: "Teacher",
          student: "Student",
        };

  // Students see a minimal nav — only surfaces that act on assignments
  // sent to them. No lessons catalog (they only consume what was assigned;
  // the per-lesson page at /student/lessons/[slug] is still reachable via
  // deep link). Music catalog stays so they can revisit assigned songs.
  const studentNav = [
    { href: "/student", label: labels.dashboard },
    { href: "/student/music", label: labels.music },
    { href: "/student/chat", label: labels.aiTutor },
    { href: "/student/profile", label: labels.profile },
  ];

  const teacherNav: { href: string; label: string }[] = [
    { href: "/teacher/lessons", label: labels.lessons },
    {
      href: "/teacher/curriculum",
      label: locale === "pt-BR" ? "Currículo" : "Curriculum",
    },
    { href: "/teacher/music", label: labels.music },
    {
      href: "/teacher/bank",
      label: locale === "pt-BR" ? "Banco" : "Bank",
    },
    { href: "/teacher/chat", label: labels.aiTutor },
    { href: "/teacher/finance", label: locale === "pt-BR" ? "Financeiro" : "Finance" },
    { href: "/teacher/admin", label: "Admin" },
  ];
  if (isOwner) {
    teacherNav.push({
      href: "/owner/users",
      label: locale === "pt-BR" ? "Usuários" : "Users",
    });
    teacherNav.push({
      href: "/owner/management",
      label: locale === "pt-BR" ? "Gestão" : "Management",
    });
  }

  const nav = role === "teacher" ? teacherNav : studentNav;
  const showNav = nav.length > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-32 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href={`/${role}`}
          className="group flex shrink-0 items-center gap-5"
        >
          <BrandMark className="h-20 w-20" />
          <span className="hidden sm:flex sm:flex-col sm:-space-y-1">
            <span
              className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-[52px] italic leading-none text-transparent drop-shadow-sm dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400"
              style={{ letterSpacing: "-0.015em" }}
            >
              Amazing School
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Learn · Teach · Thrive
            </span>
          </span>
        </Link>

        {showNav ? (
          <nav className="hidden flex-1 justify-center md:flex">
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
                    className={cn(
                      "relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "hidden items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:inline-flex"
            )}
          >
            <span
              className={
                role === "teacher"
                  ? "h-1.5 w-1.5 rounded-full bg-indigo-500"
                  : "h-1.5 w-1.5 rounded-full bg-emerald-500"
              }
            />
            {role === "teacher" ? labels.teacher : labels.student}
          </span>

          <LocaleToggle />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background/50 pl-1 pr-2 transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={fullName} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
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
                onClick={() => signOut()}
                className="cursor-pointer text-red-600 focus:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {labels.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile nav row */}
      {showNav ? (
        <div className="mx-auto max-w-7xl px-4 pb-2 md:hidden">
          <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-background/60 p-1 backdrop-blur">
            {nav.map((link) => {
              const isActive =
                link.href === `/${role}`
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
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
