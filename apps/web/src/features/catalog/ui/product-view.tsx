"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Price } from "@ecom/ui/components/price";
import { Rating } from "@ecom/ui/components/rating";
import { WishlistButton } from "@/features/wishlist/ui/wishlist-button";
import { useShellUi } from "@/hooks/use-shell-ui";
import { deliveryUrl } from "@/lib/cloudinary/delivery";
import { storeCopy } from "@/messages/fa";
import { discountPercent, LOW_STOCK_THRESHOLD } from "../domain";
import type { ProductDetail, VariantChoice } from "../types";

export function ProductView({ product }: { product: ProductDetail }) {
  const reducedMotion = useReducedMotion();
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    initialSelection(product),
  );
  const variant = useMemo(
    () => selectedVariant(product, selected),
    [product, selected],
  );
  const gallery = product.gallery.length > 0 ? product.gallery : product.card.image ? [product.card.image] : [];
  const current = gallery[imageIndex] ?? gallery[0];
  const imageUrl = current ? deliveryUrl(current.publicId, 1200, current.kind) : null;
  const price = variant?.priceRial ?? product.card.priceRial;
  const compareAt = variant?.compareAtPriceRial ?? product.card.compareAtPriceRial;
  const discount = discountPercent(price, compareAt);
  const available = variant?.available ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
          {current && imageUrl && current.kind === "image" ? (
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0"
              initial={reducedMotion ? false : { opacity: 0 }}
              key={current.publicId}
              transition={{ duration: 0.2 }}
            >
              <Image
                alt={current.alt}
                className="object-cover"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                src={imageUrl}
              />
            </motion.div>
          ) : (
            <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              {storeCopy.noImage}
            </span>
          )}
        </div>
        {current?.kind === "video" && imageUrl ? (
          <a className="text-sm font-medium underline-offset-4 hover:underline" href={imageUrl}>
            {storeCopy.playVideo}
          </a>
        ) : null}
        {gallery.length > 1 ? (
          <div aria-label={storeCopy.gallery} className="flex gap-2 overflow-x-auto" role="list">
            {gallery.map((asset, index) => {
              const thumb = deliveryUrl(asset.publicId, 160, asset.kind);
              return (
                <button
                  aria-current={index === imageIndex}
                  aria-label={asset.alt}
                  className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-foreground"
                  key={`${asset.publicId}-${index}`}
                  onClick={() => setImageIndex(index)}
                  type="button"
                >
                  {thumb && asset.kind === "image" ? (
                    <Image alt="" className="object-cover" fill sizes="64px" src={thumb} />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        {product.card.brandName && product.card.brandSlug ? (
          <Link className="text-sm text-muted-foreground" href={`/brands/${product.card.brandSlug}`}>
            {product.card.brandName}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold md:text-3xl">{product.card.name}</h1>
        {product.card.rating != null ? (
          <Rating count={product.card.reviewCount} value={product.card.rating} />
        ) : null}
        <div className="flex flex-wrap items-end gap-3">
          {compareAt != null ? (
            <Price
              amountRial={compareAt}
              className="text-base font-normal text-muted-foreground line-through"
            />
          ) : null}
          <Price amountRial={price} className="text-xl" />
          {discount ? (
            <Badge>{new Intl.NumberFormat("fa-IR").format(discount)}٪</Badge>
          ) : null}
        </div>
        <p>{availabilityText(available)}</p>
        {variant ? <p className="text-sm text-muted-foreground">{storeCopy.sku}: {variant.sku}</p> : null}

        {product.options.map((option) => (
          <fieldset className="flex flex-col gap-2" key={option.id}>
            <legend className="text-sm font-medium">{option.name}</legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = selected[option.id] === value.id;
                return (
                  <Button
                    aria-pressed={active}
                    key={value.id}
                    onClick={() =>
                      setSelected((current) => ({ ...current, [option.id]: value.id }))
                    }
                    type="button"
                    variant={active ? "default" : "outline"}
                  >
                    {value.label}
                  </Button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="flex items-center gap-2">
          <span className="text-sm" id="quantity-label">
            {storeCopy.quantity}
          </span>
          <Button
            aria-label={storeCopy.decrease}
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            size="icon"
            type="button"
            variant="outline"
          >
            −
          </Button>
          <span aria-labelledby="quantity-label" className="min-w-8 text-center tabular-nums">
            {new Intl.NumberFormat("fa-IR").format(quantity)}
          </span>
          <Button
            aria-label={storeCopy.increase}
            onClick={() => setQuantity((current) => Math.min(99, current + 1))}
            size="icon"
            type="button"
            variant="outline"
          >
            +
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PurchaseButton disabled={!variant || available === 0} quantity={quantity} variantId={variant?.id ?? null} />
          <WishlistButton productId={product.card.id} />
          <Button nativeButton={false} render={<Link href={`/compare?p=${product.card.slug}`} />} variant="outline">
            {storeCopy.compareAdd}
          </Button>
        </div>

        <section className="rounded-xl border p-4">
          <h2 className="text-base font-semibold">{storeCopy.deliveryTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{storeCopy.deliveryBody}</p>
        </section>
        <section className="rounded-xl border p-4">
          <h2 className="text-base font-semibold">{storeCopy.sellerTitle}</h2>
          <p className="mt-2 text-sm">{product.sellerName}</p>
        </section>
      </div>
    </div>
  );
}

function PurchaseButton({
  variantId,
  quantity,
  disabled,
}: {
  variantId: string | null;
  quantity: number;
  disabled: boolean;
}) {
  return <QuantityAdd disabled={disabled} quantity={quantity} variantId={variantId} />;
}

function QuantityAdd({
  variantId,
  quantity,
  disabled,
}: {
  variantId: string | null;
  quantity: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const openCartDrawer = useShellUi((state) => state.openCartDrawer);
  const [pending, setPending] = useState(false);
  return (
    <Button
      disabled={disabled || pending || !variantId}
      onClick={() => {
        if (!variantId) return;
        setPending(true);
        void fetch("/api/cart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ variantId, quantity }),
        })
          .then(async (response) => {
            const body = (await response.json()) as { ok?: boolean; message?: string };
            if (response.ok && body.ok) {
              toast.success(body.message ?? storeCopy.added);
              openCartDrawer();
              router.refresh();
              return;
            }
            toast.error(body.message ?? storeCopy.cartFailed);
          })
          .catch(() => toast.error(storeCopy.cartFailed))
          .finally(() => setPending(false));
      }}
      type="button"
    >
      {pending ? storeCopy.adding : storeCopy.addToCart}
    </Button>
  );
}

function initialSelection(product: ProductDetail): Record<string, string> {
  const preferred =
    product.variants.find((variant) => variant.available == null || variant.available > 0) ??
    product.variants[0];
  return selectionFromVariant(product, preferred);
}

function selectionFromVariant(
  product: ProductDetail,
  variant: VariantChoice | undefined,
): Record<string, string> {
  if (!variant) return {};
  const selected: Record<string, string> = {};
  for (const option of product.options) {
    const match = option.values.find((value) => variant.optionValueIds.includes(value.id));
    if (match) selected[option.id] = match.id;
  }
  return selected;
}

function selectedVariant(product: ProductDetail, selected: Record<string, string>) {
  if (product.variants.length === 0) return null;
  if (product.options.length === 0) return product.variants[0] ?? null;
  const wanted = Object.values(selected);
  return (
    product.variants.find((variant) => wanted.every((id) => variant.optionValueIds.includes(id))) ??
    null
  );
}

function availabilityText(available: number | null): string {
  if (available == null) return storeCopy.stockUnknown;
  if (available <= 0) return storeCopy.outOfStock;
  if (available < LOW_STOCK_THRESHOLD) return storeCopy.lowStock;
  return storeCopy.inStock;
}
