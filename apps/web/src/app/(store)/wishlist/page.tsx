import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { ProductCard } from "@/features/catalog/ui/product-card";
import { loadListing } from "@/features/catalog/data/catalog-store";
import { listWishlistIds } from "@/features/wishlist/server";
import { getCurrentActor } from "@/lib/auth/current-user";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export const metadata: Metadata = storeMetadata({
  title: storeCopy.wishlist,
  description: storeCopy.wishlistEmptyBody,
  path: "/wishlist",
  index: false,
});

export default async function WishlistPage() {
  const actor = await getCurrentActor();
  if (!actor) {
    return (
      <EmptyState
        action={
          <Button nativeButton={false} render={<Link href="/auth/login?next=/wishlist" />}>
            {storeCopy.login}
          </Button>
        }
        description={storeCopy.wishlistLogin}
        heading="h1"
        title={storeCopy.wishlist}
      />
    );
  }

  const ids = await listWishlistIds();
  const listing = await loadListing(
    { q: "", sort: "newest", page: 1, category: "", brand: [], attr: [], inStock: false },
    { productIds: ids },
  );

  if (listing.status === "unavailable") {
    return <EmptyState description={storeCopy.wishlistUnavailable} heading="h1" title={storeCopy.wishlist} />;
  }
  if (listing.items.length === 0) {
    return (
      <EmptyState
        action={
          <Button nativeButton={false} render={<Link href="/products" />}>
            {storeCopy.browseProducts}
          </Button>
        }
        description={storeCopy.wishlistEmptyBody}
        heading="h1"
        title={storeCopy.wishlistEmptyTitle}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{storeCopy.wishlist}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {listing.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
