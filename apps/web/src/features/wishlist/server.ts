import "server-only";

import { getCurrentActor } from "@/lib/auth/current-user";
import { getDb, missingRelation, mutate, query, readRows, str } from "@/features/catalog/data/db";

export async function listWishlistIds(): Promise<string[]> {
  const actor = await getCurrentActor();
  if (!actor) return [];
  const db = await getDb();
  if (!db) return [];
  const rows = await readRows(
    query(db, "wishlist_items", "product_id").eq("user_id", actor.userId),
  );
  if (rows === "missing") return [];
  return rows.map((row) => str(row, "product_id")).filter(Boolean);
}

export async function toggleWishlist(productId: string): Promise<
  | { ok: true; saved: boolean }
  | { ok: false; code: "unauthenticated" | "unavailable" | "failed" }
> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, code: "unauthenticated" };
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };

  const existing = await readRows(
    query(db, "wishlist_items", "product_id")
      .eq("user_id", actor.userId)
      .eq("product_id", productId),
  );
  if (existing === "missing") return { ok: false, code: "unavailable" };

  const write =
    existing.length > 0
      ? await mutate(db, "wishlist_items")
          .delete()
          .eq("user_id", actor.userId)
          .eq("product_id", productId)
      : await mutate(db, "wishlist_items").insert({
          user_id: actor.userId,
          product_id: productId,
        });

  if (write.error) {
    return { ok: false, code: missingRelation(write.error) ? "unavailable" : "failed" };
  }
  return { ok: true, saved: existing.length === 0 };
}
