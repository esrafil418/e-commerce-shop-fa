import Link from "next/link";
import type { CatalogQuery } from "@ecom/validation";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { ProductCard } from "@/features/catalog/ui/product-card";
import { listingHref } from "@/features/catalog/domain";
import type { BrandSummary, ListingResult } from "@/features/catalog/types";
import { storeCopy } from "@/messages/fa";

const sorts = [
  ["newest", storeCopy.sortNewest],
  ["price_asc", storeCopy.sortPriceAsc],
  ["price_desc", storeCopy.sortPriceDesc],
  ["popular", storeCopy.sortPopular],
] as const;

export function ListingView({
  pathname,
  query,
  listing,
  brands,
}: {
  pathname: string;
  query: CatalogQuery;
  listing: ListingResult;
  brands: BrandSummary[];
}) {
  if (listing.status === "unavailable") {
    return (
      <EmptyState
        description={storeCopy.catalogUnavailableBody}
        title={storeCopy.catalogUnavailableTitle}
      />
    );
  }

  const pages = Math.max(1, Math.ceil(listing.total / listing.pageSize));
  const filtered =
    query.q.length > 0 ||
    query.sort !== "newest" ||
    query.inStock ||
    query.brand.length > 0 ||
    query.min != null ||
    query.max != null;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <form action={pathname} className="flex flex-col gap-3 rounded-xl border p-4" method="get">
        <h2 className="text-sm font-semibold">{storeCopy.filters}</h2>
        <label className="flex flex-col gap-1 text-sm">
          {storeCopy.sort}
          <select className="h-8 rounded-lg border bg-background px-2" defaultValue={query.sort} name="sort">
            {sorts.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {storeCopy.minPrice}
          <input
            className="h-8 rounded-lg border bg-background px-2"
            defaultValue={query.min ?? ""}
            inputMode="numeric"
            name="min"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {storeCopy.maxPrice}
          <input
            className="h-8 rounded-lg border bg-background px-2"
            defaultValue={query.max ?? ""}
            inputMode="numeric"
            name="max"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input defaultChecked={query.inStock} name="inStock" type="checkbox" value="1" />
          {storeCopy.inStockOnly}
        </label>
        {brands.length > 0 ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{storeCopy.brands}</legend>
            {brands.map((brand) => (
              <label className="flex items-center gap-2 text-sm" key={brand.id}>
                <input
                  defaultChecked={query.brand.includes(brand.slug)}
                  name="brand"
                  type="checkbox"
                  value={brand.slug}
                />
                {brand.name}
              </label>
            ))}
          </fieldset>
        ) : null}
        {query.q ? <input name="q" type="hidden" value={query.q} /> : null}
        <Button type="submit">{storeCopy.applyFilters}</Button>
        <Button nativeButton={false} render={<Link href={pathname} />} variant="outline">
          {storeCopy.clearFilters}
        </Button>
      </form>

      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {new Intl.NumberFormat("fa-IR").format(listing.total)} {storeCopy.results}
        </p>
        {listing.items.length === 0 ? (
          <EmptyState
            action={
              filtered ? (
                <Button nativeButton={false} render={<Link href={pathname} />}>
                  {storeCopy.clearFilters}
                </Button>
              ) : (
                <Button nativeButton={false} render={<Link href="/categories" />}>
                  {storeCopy.browseCategories}
                </Button>
              )
            }
            description={filtered ? storeCopy.listingEmptyBody : storeCopy.noProductsBody}
            title={filtered ? storeCopy.listingEmptyTitle : storeCopy.noProductsTitle}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {listing.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {pages > 1 ? (
          <nav aria-label={storeCopy.pagination} className="flex items-center gap-3">
            {listing.page > 1 ? (
              <Link href={listingHref(pathname, query, listing.page - 1)}>{storeCopy.previousPage}</Link>
            ) : null}
            <span>
              {storeCopy.page} {new Intl.NumberFormat("fa-IR").format(listing.page)} {storeCopy.of}{" "}
              {new Intl.NumberFormat("fa-IR").format(pages)}
            </span>
            {listing.page < pages ? (
              <Link href={listingHref(pathname, query, listing.page + 1)}>{storeCopy.nextPage}</Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
