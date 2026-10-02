import type { MetadataRoute } from "next";
import { publicApi } from "@/lib/server-api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = ["", "/cursos", "/terminos", "/privacidad", "/reembolsos"].map((path) => ({
    url: `${APP_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const courses: MetadataRoute.Sitemap = [];
  try {
    for (let page = 1; page <= 50; page++) {
      const res = await publicApi.courses.$get({ query: { page: String(page), pageSize: "48", sort: "newest" } });
      if (!res.ok) break;
      const data = await res.json();
      for (const course of data.items) {
        courses.push({
          url: `${APP_URL}/cursos/${course.slug}`,
          lastModified: course.publishedAt ?? undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
      if (page >= data.pageCount) break;
    }
  } catch {
    // Sin API (por ejemplo en el build) el sitemap solo incluye las páginas estáticas.
  }

  return [...staticPages, ...courses];
}
