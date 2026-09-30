"use client";

import { HeartIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ecom/ui/components/button";
import { storeCopy } from "@/messages/fa";
import { toggleSaved } from "../toggle";

type WishlistCache = { ids: string[] };

async function readWishlist(): Promise<WishlistCache> {
  const response = await fetch("/api/wishlist");
  if (!response.ok) return { ids: [] };
  const body = (await response.json()) as { ids?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];
  return { ids };
}

export function WishlistButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const wishlist = useQuery({
    queryKey: ["wishlist"],
    queryFn: readWishlist,
    retry: false,
  });
  const saved = wishlist.data?.ids.includes(productId) ?? false;
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (response.status === 401) throw new Error("unauthenticated");
      if (!response.ok) throw new Error("failed");
      return response.json() as Promise<{ saved: boolean }>;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["wishlist"] });
      const previous = queryClient.getQueryData<WishlistCache>(["wishlist"]);
      queryClient.setQueryData<WishlistCache>(["wishlist"], (current) => ({
        ids: toggleSaved(current?.ids ?? [], productId),
      }));
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(["wishlist"], context?.previous ?? { ids: [] });
      toast.error(
        error.message === "unauthenticated" ? storeCopy.wishlistLogin : storeCopy.actionFailed,
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  return (
    <Button
      aria-pressed={saved}
      aria-label={saved ? storeCopy.wishlistRemove : storeCopy.wishlistAdd}
      className={className}
      onClick={() => mutation.mutate()}
      size="icon"
      type="button"
      variant="outline"
    >
      <HeartIcon className={saved ? "fill-current" : undefined} />
    </Button>
  );
}
