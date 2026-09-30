import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { ListingView } from "@/features/catalog/ui/listing-view";
import { loadBrandPage, loadBrandsForFilters } from "@/features/catalog/data/catalog-store";
import { isIndexableListing } from "@/features/catalog/domain";
import { readCatalogQuery } from "@/lib/search-params";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const query = readCatalogQuery(await searchParams);
  const result = await loadBrandPage(slug, query);
  const title = result.status === "ready" ? result.brand.name : storeCopy.brands;
  return storeMetadata({
    title,
    description: title,
    path: `/brands/${slug}`,
    index: result.status === "ready" && isIndexableListing(query),
  });
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = readCatalogQuery(await searchParams);
  const result = await loadBrandPage(slug, query);
  if (result.status === "missing") notFound();
  if (result.status === "unavailable") {
    return (
      <EmptyState
        description={storeCopy.catalogUnavailableBody}
        heading="h1"
        title={storeCopy.catalogUnavailableTitle}
      />
    );
  }

  const brands = await loadBrandsForFilters();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">{result.brand.name}</h1>
      <ListingView
        brands={brands}
        listing={result.listing}
        pathname={`/brands/${result.brand.slug}`}
        query={query}
      />
    </div>
  );
}
