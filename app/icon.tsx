import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * Favicon rendered on the edge — the existing favicon.ico covers
 * legacy tabs, but modern browsers pick up icon.png here and
 * render a richer gradient mark. Same palette as the OG card.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
          color: "white",
          fontSize: 40,
          fontWeight: 800,
          borderRadius: 12,
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
