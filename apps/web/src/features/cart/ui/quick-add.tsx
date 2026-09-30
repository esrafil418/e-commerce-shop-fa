"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@ecom/ui/components/button";
import { useShellUi } from "@/hooks/use-shell-ui";
import { storeCopy } from "@/messages/fa";

export function QuickAdd({
  variantId,
  disabled,
  label = storeCopy.quickAdd,
}: {
  variantId: string | null;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const openCartDrawer = useShellUi((state) => state.openCartDrawer);
  const [pending, setPending] = useState(false);

  return (
    <Button
      disabled={disabled || !variantId || pending}
      onClick={() => {
        if (!variantId) return;
        setPending(true);
        void fetch("/api/cart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ variantId, quantity: 1 }),
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
      {pending ? storeCopy.adding : label}
    </Button>
  );
}
