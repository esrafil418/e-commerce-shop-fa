import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW } from "@/lib/seo/robots-policy";
import { siteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
