"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ecom/ui/components/button";
import { storeCopy } from "@/messages/fa";

export function CartQuantityForm({ itemId, quantity }: { itemId: string; quantity: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function update(next: number) {
    setPending(true);
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, quantity: next }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button aria-label={storeCopy.decrease} disabled={pending} onClick={() => void update(quantity - 1)} size="icon" type="button" variant="outline">
        −
      </Button>
      <span className="min-w-8 text-center tabular-nums">
        {new Intl.NumberFormat("fa-IR").format(quantity)}
      </span>
      <Button aria-label={storeCopy.increase} disabled={pending} onClick={() => void update(quantity + 1)} size="icon" type="button" variant="outline">
        +
      </Button>
      <Button disabled={pending} onClick={() => void update(0)} type="button" variant="ghost">
        {storeCopy.remove}
      </Button>
    </div>
  );
}
