import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://amazingschool.app";

/**
 * Crawlers see the public marketing surface + auth entry points,
 * nothing behind a login. Everything under /teacher, /student,
 * /owner, /api is gated by middleware anyway — listing it as
 * Disallow makes the crawler skip it outright instead of
 * following a redirect chain.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/demo", "/join"],
        disallow: [
          "/teacher",
          "/student",
          "/owner",
          "/api",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
