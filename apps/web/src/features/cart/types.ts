import type { MediaAsset } from "@/features/catalog/types";

export type CartLine = {
  id: string;
  variantId: string;
  quantity: number;
  name: string;
  variantLabel: string;
  unitPriceRial: number;
  slug: string;
  image: MediaAsset | null;
};

export type CartSnapshot = {
  status: "ready" | "unavailable";
  lines: CartLine[];
  itemCount: number;
};
