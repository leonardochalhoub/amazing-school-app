"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  studentId: string;
  name: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
}

interface LeaderboardTableProps {
  classroomId: string;
  initialData: LeaderboardEntry[];
  currentUserId?: string;
}

const positionStyles: Record<number, string> = {
  0: "bg-yellow-50 border-yellow-200",
  1: "bg-gray-50 border-gray-200",
  2: "bg-orange-50 border-orange-200",
};

const medals = ["🥇", "🥈", "🥉"];

export function LeaderboardTable({
  classroomId,
  initialData,
  currentUserId,
}: LeaderboardTableProps) {
  const [rankings, setRankings] = useState(initialData);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`xp-${classroomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "xp_events",
          filter: `classroom_id=eq.${classroomId}`,
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId]);

  async function fetchLeaderboard() {
    const { data: members } = await supabase
      .from("classroom_members")
      .select("student_id, profiles(full_name, avatar_url)")
      .eq("classroom_id", classroomId);

    const { data: xpEvents } = await supabase
      .from("xp_events")
      .select("student_id, xp_amount")
      .eq("classroom_id", classroomId);

    if (!members) return;

    const xpMap: Record<string, number> = {};
    xpEvents?.forEach((e) => {
      xpMap[e.student_id] = (xpMap[e.student_id] ?? 0) + e.xp_amount;
    });

    const updated = members
      .map((m) => ({
        studentId: m.student_id,
        name: (m.profiles as unknown as { full_name: string })?.full_name ?? "Unknown",
        avatarUrl: (m.profiles as unknown as { avatar_url: string | null })?.avatar_url,
        totalXp: xpMap[m.student_id] ?? 0,
        level: Math.floor((xpMap[m.student_id] ?? 0) / 100) + 1,
      }))
      .sort((a, b) => b.totalXp - a.totalXp);

    setRankings(updated);
  }

  return (
    <div className="space-y-2">
      {rankings.map((entry, i) => {
        const initials = entry.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={entry.studentId}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              i < 3 && positionStyles[i],
              entry.studentId === currentUserId && "ring-2 ring-primary"
            )}
          >
            <span className="w-8 text-center font-bold text-lg">
              {i < 3 ? medals[i] : i + 1}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="flex-1 font-medium text-sm">{entry.name}</span>
            <Badge variant="secondary" className="text-xs">
              Lv.{entry.level}
            </Badge>
            <span className="font-bold text-sm">{entry.totalXp} XP</span>
          </div>
        );
      })}

      {rankings.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No students yet. Share the invite code!
        </p>
      )}
    </div>
  );
}
