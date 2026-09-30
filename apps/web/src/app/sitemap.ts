import type { MetadataRoute } from "next";
import { listSitemapEntries } from "@/features/catalog/data/catalog-store";
import { absoluteUrl } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await listSitemapEntries();
  return entries.map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: entry.lastModified ? new Date(entry.lastModified) : undefined,
  }));
}
