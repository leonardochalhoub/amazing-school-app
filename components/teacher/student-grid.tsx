import { StudentCard, type StudentRow } from "./student-card";

export function StudentGrid({ rows }: { rows: StudentRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No students yet. Share the invite code to get started.
      </p>
    );
  }
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((row) => (
        <StudentCard key={row.studentId} row={row} />
      ))}
    </div>
  );
}

export type { StudentRow };
