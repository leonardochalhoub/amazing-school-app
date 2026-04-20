import { AmazingSchoolMark } from "@/components/reports/amazing-school-mark";

/**
 * Subtle Amazing School brand signature at the bottom of every
 * report. Uses the same SVG + wordmark rendition as the header so
 * the platform mark is redundantly visible on every paper regardless
 * of where the reader's eye lands.
 */
export function BrandWatermark({
  tagline = "Emitido por Amazing School · amazing-school-app.vercel.app",
}: {
  tagline?: string;
}) {
  return (
    <div
      className="report-avoid-break"
      style={{
        marginTop: 18,
        paddingTop: 10,
        borderTop: "1px dashed #d1d5db",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 999,
          padding: "4px 12px 4px 6px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <AmazingSchoolMark size={18} wordmark={false} />
        <span
          style={{
            fontSize: "8.5pt",
            color: "#4b5563",
            letterSpacing: "0.02em",
            fontWeight: 500,
          }}
        >
          {tagline}
        </span>
      </div>
    </div>
  );
}
