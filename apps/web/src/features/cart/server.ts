import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { addToCartSchema } from "@ecom/validation";
import { parseTrusted } from "@/features/auth/access";
import { getCurrentActor } from "@/lib/auth/current-user";
import { storeCopy } from "@/messages/fa";
import {
  getDb,
  missingRelation,
  mutate,
  num,
  query,
  readRows,
  str,
  type Db,
} from "@/features/catalog/data/db";
import type { CartLine, CartSnapshot } from "./types";

export type { CartLine, CartSnapshot };

const GUEST_COOKIE = "guest_cart";

const emptyCart: CartSnapshot = { status: "ready", lines: [], itemCount: 0 };

export async function loadCart(): Promise<CartSnapshot> {
  const db = await getDb();
  if (!db) return { ...emptyCart, status: "unavailable" };
  const cartId = await findCartId(db);
  if (cartId === "missing") return { ...emptyCart, status: "unavailable" };
  if (!cartId) return emptyCart;
  return readCart(db, cartId);
}

export async function addToCart(raw: {
  variantId: string;
  quantity: number;
}): Promise<{ ok: boolean; message: string; itemCount: number }> {
  const parsed = parseTrusted(addToCartSchema, raw);
  if (!parsed.ok) {
    return { ok: false, message: parsed.error.message, itemCount: 0 };
  }

  const db = await getDb();
  if (!db) return { ok: false, message: storeCopy.cartUnavailable, itemCount: 0 };

  const variant = await readVariant(db, parsed.data.variantId);
  if (variant === "missing") return { ok: false, message: storeCopy.cartUnavailable, itemCount: 0 };
  if (!variant) return { ok: false, message: storeCopy.cartFailed, itemCount: 0 };

  const cartId = await ensureCart(db);
  if (cartId === "missing" || !cartId) {
    return { ok: false, message: storeCopy.cartUnavailable, itemCount: 0 };
  }

  const existing = await readRows(
    query(db, "cart_items", "id, quantity").eq("cart_id", cartId).eq("variant_id", variant.id),
  );
  if (existing === "missing") return { ok: false, message: storeCopy.cartUnavailable, itemCount: 0 };

  const current = existing[0];
  const nextQuantity = Math.min(99, (current ? num(current, "quantity") ?? 0 : 0) + parsed.data.quantity);
  const write = current
    ? await mutate(db, "cart_items").update({ quantity: nextQuantity }).eq("id", str(current, "id"))
    : await mutate(db, "cart_items").insert({
        cart_id: cartId,
        variant_id: variant.id,
        quantity: nextQuantity,
      });

  if (write.error) {
    if (missingRelation(write.error)) {
      return { ok: false, message: storeCopy.cartUnavailable, itemCount: 0 };
    }
    return { ok: false, message: storeCopy.cartFailed, itemCount: 0 };
  }

  revalidatePath("/cart");
  const snapshot = await readCart(db, cartId);
  return { ok: true, message: storeCopy.added, itemCount: snapshot.itemCount };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartSnapshot> {
  const db = await getDb();
  if (!db) return { ...emptyCart, status: "unavailable" };
  const cartId = await findCartId(db);
  if (cartId === "missing") return { ...emptyCart, status: "unavailable" };
  if (!cartId) return emptyCart;

  if (quantity <= 0) {
    await mutate(db, "cart_items").delete().eq("id", itemId).eq("cart_id", cartId);
  } else {
    const capped = Math.min(99, Math.floor(quantity));
    await mutate(db, "cart_items").update({ quantity: capped }).eq("id", itemId).eq("cart_id", cartId);
  }
  revalidatePath("/cart");
  return readCart(db, cartId);
}

async function readVariant(
  db: Db,
  variantId: string,
): Promise<{ id: string } | null | "missing"> {
  const rows = await readRows(
    query(db, "product_variants", "id, product_id, is_active").eq("id", variantId).eq("is_active", true),
  );
  if (rows === "missing") return "missing";
  const variant = rows[0];
  if (!variant) return null;
  const products = await readRows(
    query(db, "products", "id, status").eq("id", str(variant, "product_id")).eq("status", "published"),
  );
  if (products === "missing") return "missing";
  return products[0] ? { id: str(variant, "id") } : null;
}

async function findCartId(db: Db): Promise<string | null | "missing"> {
  const actor = await getCurrentActor();
  if (actor) {
    const rows = await readRows(
      query(db, "carts", "id, status").eq("user_id", actor.userId).eq("status", "open").limit(1),
    );
    if (rows === "missing") return "missing";
    return rows[0] ? str(rows[0], "id") : null;
  }

  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!token) return null;
  const rows = await readRows(
    query(db, "carts", "id, status")
      .eq("guest_token_hash", hashToken(token))
      .eq("status", "open")
      .limit(1),
  );
  if (rows === "missing") return "missing";
  return rows[0] ? str(rows[0], "id") : null;
}

async function ensureCart(db: Db): Promise<string | null | "missing"> {
  const existing = await findCartId(db);
  if (existing) return existing;
  const actor = await getCurrentActor();
  let guestHash: string | null = null;
  if (!actor) {
    const token = randomBytes(32).toString("hex");
    (await cookies()).set(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
    guestHash = hashToken(token);
  }

  const created = await mutate(db, "carts")
    .insert({
      user_id: actor?.userId ?? null,
      guest_token_hash: guestHash,
      status: "open",
    })
    .select("id")
    .single();

  if (created.error) {
    return missingRelation(created.error) ? "missing" : null;
  }
  const row = created.data;
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  return str(row as Record<string, unknown>, "id") || null;
}

async function readCart(db: Db, cartId: string): Promise<CartSnapshot> {
  const items = await readRows(
    query(db, "cart_items", "id, variant_id, quantity").eq("cart_id", cartId),
  );
  if (items === "missing") return { ...emptyCart, status: "unavailable" };
  if (items.length === 0) return emptyCart;

  const variantIds = items.map((item) => str(item, "variant_id")).filter(Boolean);
  const variants = await readRows(
    query(db, "product_variants", "id, product_id, sku, price_rial").in("id", variantIds),
  );
  if (variants === "missing") return { ...emptyCart, status: "unavailable" };
  const productIds = variants.map((variant) => str(variant, "product_id")).filter(Boolean);
  const products = productIds.length
    ? await readRows(query(db, "products", "id, name_fa, slug").in("id", productIds))
    : [];
  if (products === "missing") return { ...emptyCart, status: "unavailable" };
  const media = productIds.length
    ? await readRows(
        query(db, "product_media", "product_id, cloudinary_public_id, alt_fa, width, height, kind, position").in(
          "product_id",
          productIds,
        ),
      )
    : [];

  const variantById = new Map(variants.map((row) => [str(row, "id"), row]));
  const productById = new Map(products.map((row) => [str(row, "id"), row]));
  const mediaRows = media === "missing" ? [] : media;

  const lines: CartLine[] = [];
  for (const item of items) {
    const variant = variantById.get(str(item, "variant_id"));
    if (!variant) continue;
    const product = productById.get(str(variant, "product_id"));
    if (!product) continue;
    const imageRow = mediaRows
      .filter((row) => str(row, "product_id") === str(product, "id") && str(row, "kind") !== "video")
      .sort((left, right) => (num(left, "position") ?? 0) - (num(right, "position") ?? 0))[0];
    lines.push({
      id: str(item, "id"),
      variantId: str(variant, "id"),
      quantity: num(item, "quantity") ?? 1,
      name: str(product, "name_fa"),
      variantLabel: str(variant, "sku"),
      unitPriceRial: num(variant, "price_rial") ?? 0,
      slug: str(product, "slug"),
      image: imageRow
        ? {
            publicId: str(imageRow, "cloudinary_public_id"),
            alt: str(imageRow, "alt_fa") || str(product, "name_fa"),
            width: num(imageRow, "width"),
            height: num(imageRow, "height"),
            kind: "image",
          }
        : null,
    });
  }

  return {
    status: "ready",
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
