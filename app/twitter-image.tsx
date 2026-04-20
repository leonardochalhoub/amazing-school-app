// Twitter scrapers prefer a dedicated twitter-image endpoint. We
// reuse the OG composition by importing the default renderer, but
// the config exports (runtime, size, alt, contentType) have to be
// statically declared here — Next won't accept re-exports for
// route-segment config.
export { default } from "./opengraph-image";

export const runtime = "edge";
export const alt = "Amazing School — English learning with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
