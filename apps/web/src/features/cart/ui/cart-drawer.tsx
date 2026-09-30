"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Price } from "@ecom/ui/components/price";
import { Button } from "@ecom/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ecom/ui/components/sheet";
import { useShellUi } from "@/hooks/use-shell-ui";
import { storeCopy } from "@/messages/fa";
import type { CartSnapshot } from "../types";

export function CartDrawer({ cart }: { cart: CartSnapshot }) {
  const router = useRouter();
  const open = useShellUi((state) => state.cartDrawerOpen);
  const setOpen = useShellUi((state) => state.closeCartDrawer);
  const openDrawer = useShellUi((state) => state.openCartDrawer);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function update(itemId: string, quantity: number) {
    setPendingId(itemId);
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    setPendingId(null);
    router.refresh();
  }

  return (
    <Sheet
      onOpenChange={(next) => {
        if (next) openDrawer();
        else setOpen();
      }}
      open={open}
    >
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>{storeCopy.cartDrawer}</SheetTitle>
        </SheetHeader>
        {cart.status === "unavailable" ? (
          <p className="text-sm text-muted-foreground">{storeCopy.cartUnavailable}</p>
        ) : cart.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{storeCopy.cartEmptyBody}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {cart.lines.map((line) => (
              <li className="flex flex-col gap-2 border-b pb-3" key={line.id}>
                <Link className="font-medium" href={`/products/${line.slug}`}>
                  {line.name}
                </Link>
                <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
                <p className="text-sm">
                  {storeCopy.unitPrice} <Price amountRial={line.unitPriceRial} />
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    aria-label={storeCopy.decrease}
                    disabled={pendingId === line.id}
                    onClick={() => void update(line.id, line.quantity - 1)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    −
                  </Button>
                  <span className="tabular-nums">
                    {new Intl.NumberFormat("fa-IR").format(line.quantity)}
                  </span>
                  <Button
                    aria-label={storeCopy.increase}
                    disabled={pendingId === line.id}
                    onClick={() => void update(line.id, line.quantity + 1)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    +
                  </Button>
                  <Button
                    disabled={pendingId === line.id}
                    onClick={() => void update(line.id, 0)}
                    type="button"
                    variant="ghost"
                  >
                    {storeCopy.remove}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">{storeCopy.cartQuotePending}</p>
        <Button nativeButton={false} render={<Link href="/cart" />}>
          {storeCopy.cart}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
