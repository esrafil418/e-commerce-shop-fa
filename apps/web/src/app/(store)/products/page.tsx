import type { Metadata } from "next";
import { ListingView } from "@/features/catalog/ui/listing-view";
import { loadBrandsForFilters, loadListing } from "@/features/catalog/data/catalog-store";
import { isIndexableListing } from "@/features/catalog/domain";
import { readCatalogQuery } from "@/lib/search-params";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = readCatalogQuery(await searchParams);
  return storeMetadata({
    title: storeCopy.products,
    description: storeCopy.heroBody,
    path: "/products",
    index: isIndexableListing(query),
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = readCatalogQuery(await searchParams);
  const [listing, brands] = await Promise.all([
    loadListing(query, { q: query.q }),
    loadBrandsForFilters(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">{storeCopy.products}</h1>
      <ListingView brands={brands} listing={listing} pathname="/products" query={query} />
    </div>
  );
}
