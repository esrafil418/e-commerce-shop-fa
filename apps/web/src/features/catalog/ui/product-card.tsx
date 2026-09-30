"use client";

"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@ecom/ui/components/badge";
import { Price } from "@ecom/ui/components/price";
import { Rating } from "@ecom/ui/components/rating";
import { deliveryUrl } from "@/lib/cloudinary/delivery";
import { storeCopy } from "@/messages/fa";
import { QuickAdd } from "@/features/cart/ui/quick-add";
import { WishlistButton } from "@/features/wishlist/ui/wishlist-button";
import type { CatalogCard } from "../types";

export function ProductCard({ product }: { product: CatalogCard }) {
  const imageUrl = product.image ? deliveryUrl(product.image.publicId, 640, "image") : null;
  const href = `/products/${product.slug}`;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
      <WishlistButton className="absolute end-2 top-2 z-10" productId={product.id} />
      <Link className="flex min-w-0 flex-1 flex-col gap-3 p-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring" href={href}>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {imageUrl && product.image ? (
            <Image
              alt={product.image.alt}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              src={imageUrl}
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              {storeCopy.noImage}
            </span>
          )}
          <span className="absolute start-2 top-2 flex flex-col items-start gap-1">
            {product.discountPercent ? (
              <Badge>
                {new Intl.NumberFormat("fa-IR").format(product.discountPercent)}٪
              </Badge>
            ) : null}
            {product.stock === "out_of_stock" ? (
              <Badge variant="secondary">{storeCopy.outOfStock}</Badge>
            ) : null}
          </span>
        </div>
        {product.brandName ? (
          <p className="text-xs text-muted-foreground">{product.brandName}</p>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        {product.rating != null ? (
          <Rating count={product.reviewCount} value={product.rating} />
        ) : null}
        <div className="mt-auto flex flex-col gap-1">
          {product.compareAtPriceRial != null ? (
            <Price
              amountRial={product.compareAtPriceRial}
              className="text-sm font-normal text-muted-foreground line-through"
            />
          ) : null}
          <Price amountRial={product.priceRial} />
          <p className="text-xs text-muted-foreground">
            {product.stock === "in_stock"
              ? storeCopy.inStock
              : product.stock === "out_of_stock"
                ? storeCopy.outOfStock
                : storeCopy.stockUnknown}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <QuickAdd
          disabled={product.stock === "out_of_stock"}
          variantId={product.defaultVariantId}
        />
      </div>
    </article>
  );
}
