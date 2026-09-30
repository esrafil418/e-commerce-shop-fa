import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { ListingView } from "@/features/catalog/ui/listing-view";
import { loadCategoryPage } from "@/features/catalog/data/catalog-store";
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
  const result = await loadCategoryPage(slug, query);
  const title = result.status === "ready" ? result.category.name : storeCopy.categories;
  return storeMetadata({
    title,
    description: title,
    path: `/categories/${slug}`,
    index: result.status === "ready" && isIndexableListing(query),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = readCatalogQuery(await searchParams);
  const result = await loadCategoryPage(slug, query);
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

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="breadcrumb" className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/categories">{storeCopy.categories}</Link>
        {result.ancestors.map((ancestor) => (
          <Link href={`/categories/${ancestor.slug}`} key={ancestor.id}>
            {ancestor.name}
          </Link>
        ))}
      </nav>
      <h1 className="text-2xl font-bold md:text-3xl">{result.category.name}</h1>
      <ListingView
        brands={result.brands}
        listing={result.listing}
        pathname={`/categories/${result.category.slug}`}
        query={query}
      />
    </div>
  );
}
