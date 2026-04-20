import Image from "next/image";
import { SCHOOL_LOGO_SRC } from "@/lib/school-logo";

/**
 * Subtle Amazing School brand signature shown on every teacher /
 * student report. Sits right above the generated-at footer so every
 * document carries the platform mark without competing with the
 * teacher's own branding.
 *
 * Layout is intentionally minimal — logo + thin tagline — so the
 * report feels institutionally endorsed rather than overdesigned.
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
        opacity: 0.85,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 999,
          padding: "4px 10px",
          gap: 8,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <Image
          src={SCHOOL_LOGO_SRC}
          alt="Amazing School"
          width={22}
          height={22}
          unoptimized
        />
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
