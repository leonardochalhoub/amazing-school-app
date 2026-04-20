import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Amazing School — English learning with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default OG / Twitter card served at every route that doesn't
 * override it. Rendered on the edge with next/og so we don't ship
 * a 1200×630 PNG in the repo and we can restyle by changing JSX.
 *
 * Style notes:
 *   - Radial gradient echoes the app's landing hero palette so the
 *     social card visually matches the site when a visitor lands.
 *   - Type mixes Inter (would be Jakarta on the live site but
 *     Inter ships with next/og without a font fetch) — good
 *     enough for a card; social scrapers don't care about the
 *     font family, just the composition.
 */
export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(1200px 600px at 80% 20%, rgba(244,114,182,0.35), transparent 60%), radial-gradient(1000px 600px at 10% 90%, rgba(99,102,241,0.45), transparent 60%), #0a0a0a",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background:
                "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🎓
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            Amazing School
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Inglês com IA
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, #818cf8, #c084fc, #f472b6)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              para brasileiros.
            </span>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Lições CEFR · Tutor 24/7 · Pronunciation lab · Gamification ·
            Free & open-source.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <div>amazing-school-app.vercel.app</div>
          <div style={{ display: "flex", gap: 16 }}>
            <span>A1 → B2</span>
            <span>·</span>
            <span>pt-BR · en</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
