import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { CheckoutForm } from "@/features/checkout/ui/checkout-form";
import { loadCart } from "@/features/cart/server";
import { listShippingMethods } from "@/features/checkout/server";
import { getCurrentActor } from "@/lib/auth/current-user";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export const metadata: Metadata = storeMetadata({
  title: storeCopy.checkout,
  description: storeCopy.checkoutUnavailable,
  path: "/checkout",
  index: false,
});

export default async function CheckoutPage() {
  const [cart, actor, methods] = await Promise.all([
    loadCart(),
    getCurrentActor(),
    listShippingMethods(),
  ]);

  if (cart.lines.length === 0 || cart.status === "unavailable") {
    return (
      <EmptyState
        action={
          <Button nativeButton={false} render={<Link href="/cart" />}>
            {storeCopy.cart}
          </Button>
        }
        description={cart.status === "unavailable" ? storeCopy.cartUnavailable : storeCopy.checkoutEmpty}
        heading="h1"
        title={storeCopy.checkout}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{storeCopy.checkout}</h1>
      <CheckoutForm methods={methods} signedIn={Boolean(actor)} />
    </div>
  );
}
