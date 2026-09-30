import type { Metadata } from "next";
import { ListingView } from "@/features/catalog/ui/listing-view";
import { loadBrandsForFilters, loadListing } from "@/features/catalog/data/catalog-store";
import { readCatalogQuery } from "@/lib/search-params";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export const metadata: Metadata = storeMetadata({
  title: storeCopy.searchPage,
  description: storeCopy.searchPage,
  path: "/search",
  index: false,
});

export default async function SearchPage({
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
      <h1 className="text-2xl font-bold md:text-3xl">{storeCopy.searchPage}</h1>
      <ListingView brands={brands} listing={listing} pathname="/search" query={query} />
    </div>
  );
}
