import { redirect } from "next/navigation";

// Student catalog browsing is intentionally disabled — students only see
// what was assigned to them. The per-lesson route at /student/lessons/[slug]
// is still reachable via the assignment card on /student.
export default function StudentLessonsCatalog() {
  redirect("/student");
}
