import type { Metadata } from "next";
import Link from "next/link";
import { Price } from "@ecom/ui/components/price";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { loadCart } from "@/features/cart/server";
import { CartQuantityForm } from "@/features/cart/ui/cart-quantity-form";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export const metadata: Metadata = storeMetadata({
  title: storeCopy.cart,
  description: storeCopy.cartQuotePending,
  path: "/cart",
  index: false,
});

export default async function CartPage() {
  const cart = await loadCart();
  if (cart.status === "unavailable") {
    return <EmptyState description={storeCopy.cartUnavailable} heading="h1" title={storeCopy.cart} />;
  }
  if (cart.lines.length === 0) {
    return (
      <EmptyState
        action={
          <Button nativeButton={false} render={<Link href="/products" />}>
            {storeCopy.browseProducts}
          </Button>
        }
        description={storeCopy.cartEmptyBody}
        heading="h1"
        title={storeCopy.cartEmptyTitle}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{storeCopy.cart}</h1>
      <ul className="flex flex-col gap-4">
        {cart.lines.map((line) => (
          <li className="grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_auto]" key={line.id}>
            <div>
              <Link className="font-medium" href={`/products/${line.slug}`}>
                {line.name}
              </Link>
              <p className="text-sm text-muted-foreground">{line.variantLabel}</p>
              <p className="mt-2 text-sm">
                {storeCopy.unitPrice} <Price amountRial={line.unitPriceRial} />
              </p>
            </div>
            <CartQuantityForm itemId={line.id} quantity={line.quantity} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{storeCopy.cartQuotePending}</p>
      <Button nativeButton={false} render={<Link href="/checkout" />}>
        {storeCopy.checkout}
      </Button>
    </div>
  );
}
