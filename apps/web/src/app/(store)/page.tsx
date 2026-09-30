import type { Metadata } from "next";
import { HomeContent } from "@/features/catalog/ui/home-content";
import { loadHome } from "@/features/catalog/data/catalog-store";
import { readCatalogQuery } from "@/lib/search-params";
import { siteCopy } from "@/messages/fa";
import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: { absolute: siteCopy.name },
  description: siteCopy.description,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: siteCopy.name,
    description: siteCopy.description,
    url: absoluteUrl("/"),
    locale: "fa_IR",
    type: "website",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readCatalogQuery(params);
  const model = await loadHome();
  return <HomeContent model={model} query={query.q} />;
}
