import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["sharp"],
  outputFileTracingExcludes: {
    "*": ["./scripts/**/*", "./tests/**/*"],
  },
};

export default nextConfig;
