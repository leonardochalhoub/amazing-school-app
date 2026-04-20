"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  Trophy,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: "teacher" | "student";
}

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const teacherLinks: NavLink[] = [
  { href: "/teacher", label: "Classrooms", icon: GraduationCap },
];

const studentLinks: NavLink[] = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/lessons", label: "My Lessons", icon: BookOpen },
  { href: "/student/chat", label: "AI Tutor", icon: Bot },
  { href: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "teacher" ? teacherLinks : studentLinks;

  return (
    <aside className="hidden min-h-[calc(100vh-3.5rem)] w-60 flex-col border-r border-border/70 bg-gradient-to-b from-muted/10 via-transparent to-transparent p-3 md:flex">
      <div className="mb-2 px-3 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation
        </p>
      </div>
      <nav className="flex flex-col gap-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === `/${role}`
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              {isActive ? (
                <span
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-2">
        <div className="rounded-lg border border-border/60 bg-card/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Amazing School</p>
          <p className="mt-0.5">
            {role === "teacher"
              ? "Manage classrooms & students"
              : "Learn at your pace"}
          </p>
        </div>
      </div>
    </aside>
  );
}
