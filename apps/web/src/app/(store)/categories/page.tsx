import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { loadHome } from "@/features/catalog/data/catalog-store";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export const metadata: Metadata = storeMetadata({
  title: storeCopy.categories,
  description: storeCopy.promoCategoriesBody,
  path: "/categories",
});

export default async function CategoriesPage() {
  const home = await loadHome();
  if (home.status === "unavailable") {
    return (
      <EmptyState
        description={storeCopy.catalogUnavailableBody}
        heading="h1"
        title={storeCopy.catalogUnavailableTitle}
      />
    );
  }
  if (home.categories.length === 0) {
    return <EmptyState description={storeCopy.noProductsBody} heading="h1" title={storeCopy.categories} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">{storeCopy.categories}</h1>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {home.categories.map((category) => (
          <li key={category.id}>
            <Link
              className="flex h-24 items-end rounded-xl border p-4 font-medium focus-visible:ring-3 focus-visible:ring-ring"
              href={`/categories/${category.slug}`}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
