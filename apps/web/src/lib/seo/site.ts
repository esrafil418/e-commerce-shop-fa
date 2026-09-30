import type { Metadata } from "next";
import { readPublicEnv } from "@/lib/env/public";

export function siteOrigin(): string {
  return readPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${normalized}`;
}

export function storeMetadata(input: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  image?: string | null;
}): Metadata {
  const url = absoluteUrl(input.path);
  const index = input.index ?? true;
  const images = input.image ? [{ url: input.image }] : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      locale: "fa_IR",
      type: "website",
      images,
    },
    twitter: {
      card: input.image ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
  };
}
