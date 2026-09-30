import Link from "next/link";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { ProductCard } from "@/features/catalog/ui/product-card";
import { RecentlyViewed } from "@/features/catalog/ui/recently-viewed";
import type { CatalogCard, HomeModel } from "@/features/catalog/types";
import { siteCopy, storeCopy } from "@/messages/fa";

export function HomeContent({ model, query }: { model: HomeModel; query: string }) {
  return (
    <div className="flex flex-col gap-10">
      <section className="grid gap-6 rounded-2xl bg-muted px-5 py-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:px-10 md:py-12">
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{siteCopy.heroTitle}</h1>
          <p className="max-w-xl text-base text-muted-foreground">{storeCopy.heroBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link href="/products" />}>
              {storeCopy.browseProducts}
            </Button>
            <Button nativeButton={false} render={<Link href="/categories" />} variant="outline">
              {storeCopy.browseCategories}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Promo href="/products?sort=newest" body={storeCopy.promoNewBody} title={storeCopy.promoNewTitle} />
          <Promo href="/categories" body={storeCopy.promoCategoriesBody} title={storeCopy.promoCategoriesTitle} />
        </div>
      </section>

      {query ? (
        <EmptyState
          action={
            <Button nativeButton={false} render={<Link href={`/search?q=${encodeURIComponent(query)}`} />}>
              {siteCopy.searchSubmit}
            </Button>
          }
          description={siteCopy.catalogPendingBody}
          title={`${siteCopy.catalogPendingTitle}: ${query}`}
        />
      ) : null}

      {model.status === "unavailable" ? (
        <EmptyState
          description={storeCopy.catalogUnavailableBody}
          title={storeCopy.catalogUnavailableTitle}
        />
      ) : (
        <>
          <CategoryRail categories={model.categories} />
          {model.banners.length > 0 ? (
            <section className="grid gap-3 md:grid-cols-2">
              {model.banners.map((banner) => (
                <Promo body={banner.title} href={banner.href} key={banner.id} title={banner.title} />
              ))}
            </section>
          ) : null}
          <ProductRail href="/products" products={model.featured} title={storeCopy.featured} />
          <ProductRail products={model.discounted} title={storeCopy.discounted} />
          <ProductRail products={model.popular} title={storeCopy.popular} />
          <BrandRail brands={model.brands} />
          {model.featured.length === 0 && model.discounted.length === 0 && model.popular.length === 0 ? (
            <EmptyState description={storeCopy.noProductsBody} title={storeCopy.noProductsTitle} />
          ) : null}
        </>
      )}

      <RecentlyViewed />

      <section className="max-w-3xl">
        <h2 className="text-xl font-semibold">{storeCopy.editorialTitle}</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{storeCopy.editorialBody}</p>
      </section>
    </div>
  );
}

function Promo({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      className="flex flex-col gap-2 rounded-xl bg-background p-4 ring-1 ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring"
      href={href}
    >
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{body}</span>
    </Link>
  );
}

function CategoryRail({ categories }: { categories: HomeModel["categories"] }) {
  const roots = categories.filter((category) => !category.parentId).slice(0, 8);
  const items = roots.length > 0 ? roots : categories.slice(0, 8);
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{storeCopy.categories}</h2>
        <Link className="text-sm" href="/categories">
          {storeCopy.seeAll}
        </Link>
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map((category) => (
          <li key={category.id}>
            <Link
              className="inline-flex rounded-full border px-3 py-1.5 text-sm focus-visible:ring-3 focus-visible:ring-ring"
              href={`/categories/${category.slug}`}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductRail({
  title,
  products,
  href,
}: {
  title: string;
  products: CatalogCard[];
  href?: string;
}) {
  if (products.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {href ? (
          <Link className="text-sm" href={href}>
            {storeCopy.seeAll}
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function BrandRail({ brands }: { brands: HomeModel["brands"] }) {
  if (brands.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{storeCopy.brands}</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {brands.slice(0, 8).map((brand) => (
          <li key={brand.id}>
            <Link
              className="flex h-20 items-center justify-center rounded-xl border text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring"
              href={`/brands/${brand.slug}`}
            >
              {brand.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
