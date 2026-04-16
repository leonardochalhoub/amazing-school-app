"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: "teacher" | "student";
}

const teacherLinks = [
  { href: "/teacher", label: "Dashboard", icon: "📊" },
];

const studentLinks = [
  { href: "/student", label: "Dashboard", icon: "📊" },
  { href: "/student/lessons", label: "My Lessons", icon: "📖" },
  { href: "/student/chat", label: "AI Tutor", icon: "🤖" },
  { href: "/student/leaderboard", label: "Leaderboard", icon: "🏆" },
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "teacher" ? teacherLinks : studentLinks;

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-border bg-muted/30 p-4 min-h-[calc(100vh-3.5rem)]">
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive =
            link.href === `/${role}`
              ? pathname === link.href
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
