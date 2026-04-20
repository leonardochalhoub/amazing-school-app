import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple home-screen icon — larger version of the gradient mark.
 * iOS rounds it automatically, but we set a border-radius anyway
 * for non-iOS consumers that may surface the raw PNG.
 */
export default function AppleIcon() {
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
          fontSize: 112,
          fontWeight: 800,
          borderRadius: 36,
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
