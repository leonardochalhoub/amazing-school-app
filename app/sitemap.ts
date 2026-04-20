import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://amazingschool.app";

/**
 * Static sitemap — only the public pages a crawler should index.
 * Authenticated dashboards (/teacher/*, /student/*, /owner/*) stay
 * off the map so Google doesn't waste its crawl budget hitting
 * login redirects.
 *
 * Update `lastModified` by bumping the date below when the
 * marketing surface changes meaningfully. For a more dynamic
 * version, replace this with a `fetch` against your CMS / DB.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = {
    lastModified: now,
  };
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1.0,
      ...base,
    },
    {
      url: `${SITE_URL}/login`,
      changeFrequency: "yearly",
      priority: 0.4,
      ...base,
    },
    {
      url: `${SITE_URL}/signup`,
      changeFrequency: "yearly",
      priority: 0.6,
      ...base,
    },
    {
      url: `${SITE_URL}/demo/teacher`,
      changeFrequency: "monthly",
      priority: 0.7,
      ...base,
    },
    {
      url: `${SITE_URL}/demo/lessons`,
      changeFrequency: "weekly",
      priority: 0.8,
      ...base,
    },
    {
      url: `${SITE_URL}/demo/music`,
      changeFrequency: "weekly",
      priority: 0.8,
      ...base,
    },
  ];
}
