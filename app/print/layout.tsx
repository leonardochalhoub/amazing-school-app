import type { Metadata } from "next";
import "../globals.css";
import "./print.css";

// Every /print/* route opts out of the dashboard chrome (no navbar,
// no footer, no sidebar). Child pages override this metadata with
// their own `title` which browsers use as the default "Save as PDF"
// filename — so "Curriculum — Gabriel Silva — 2025.pdf" is what
// lands in the user's Downloads folder.
export const metadata: Metadata = {
  title: "Report · Amazing School",
  robots: { index: false, follow: false },
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="report-workspace">{children}</div>;
}
