import Link from "next/link";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { ProductCard } from "@/features/catalog/ui/product-card";
import { loadListing } from "@/features/catalog/data/catalog-store";
import { listWishlistIds } from "@/features/wishlist/server";
import { storeCopy } from "@/messages/fa";

export default async function ProfileWishlistPage() {
  const ids = await listWishlistIds();
  const listing = await loadListing(
    { q: "", sort: "newest", page: 1, category: "", brand: [], attr: [], inStock: false },
    { productIds: ids },
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{storeCopy.wishlist}</h1>
      {listing.status === "unavailable" ? (
        <EmptyState description={storeCopy.wishlistUnavailable} title={storeCopy.wishlist} />
      ) : listing.items.length === 0 ? (
        <EmptyState
          action={
            <Button nativeButton={false} render={<Link href="/products" />}>
              {storeCopy.browseProducts}
            </Button>
          }
          description={storeCopy.wishlistEmptyBody}
          title={storeCopy.wishlistEmptyTitle}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {listing.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
