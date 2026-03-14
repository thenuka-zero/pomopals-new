import { MetadataRoute } from "next";
import { BOOKS } from "@/lib/library-data";

// Re-generate every hour so new articles are picked up without a full redeploy
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://pomopals.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/library`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const articleRoutes: MetadataRoute.Sitemap = BOOKS.map((book) => ({
    url: `${BASE_URL}/library/${book.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
