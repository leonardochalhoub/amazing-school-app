"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StudentGrid, type StudentRow } from "./student-grid";

export function RealtimeGrid({
  classroomId,
  initial,
}: {
  classroomId: string;
  initial: StudentRow[];
}) {
  const [rows, setRows] = useState<StudentRow[]>(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`cls-${classroomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "xp_events",
          filter: `classroom_id=eq.${classroomId}`,
        },
        (payload) => {
          const record = payload.new as { student_id: string; xp_amount: number };
          setRows((prev) =>
            prev.map((r) =>
              r.studentId === record.student_id
                ? {
                    ...r,
                    totalXp: r.totalXp + (record.xp_amount ?? 0),
                    lastActivity: new Date().toISOString(),
                  }
                : r
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lesson_progress",
          filter: `classroom_id=eq.${classroomId}`,
        },
        (payload) => {
          const record = payload.new as {
            student_id: string;
            completed_at: string | null;
          };
          if (!record.completed_at) return;
          setRows((prev) =>
            prev.map((r) =>
              r.studentId === record.student_id
                ? {
                    ...r,
                    completed: r.completed + 1,
                    lastActivity: record.completed_at ?? r.lastActivity,
                  }
                : r
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classroomId]);

  return <StudentGrid rows={rows} />;
}
