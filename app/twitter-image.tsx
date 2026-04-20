// Twitter scrapers prefer a dedicated twitter-image; we reuse the
// same composition as the OG card. Next's file-based metadata
// picks this up automatically for twitter:image.
export { default, runtime, alt, size, contentType } from "./opengraph-image";
