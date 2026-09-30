import "server-only";

import { emailSchema, guestAddressSchema } from "@ecom/validation";
import { parseTrusted, requireVerifiedEmail } from "@/features/auth/access";
import { getCurrentActor } from "@/lib/auth/current-user";
import { authCopy } from "@/features/auth/messages";
import { storeCopy } from "@/messages/fa";
import { getDb, num, query, readRows, str } from "@/features/catalog/data/db";
import { loadCart } from "@/features/cart/server";

export type ShippingMethod = {
  code: string;
  name: string;
  priceRial: number;
};

export async function listShippingMethods(): Promise<ShippingMethod[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await readRows(
    query(db, "shipping_methods", "code, name_fa, price_rial, is_active").eq("is_active", true),
  );
  if (rows === "missing") return [];
  return rows.map((row) => ({
    code: str(row, "code"),
    name: str(row, "name_fa"),
    priceRial: num(row, "price_rial") ?? 0,
  }));
}

export async function placeOrder(raw: Record<string, unknown>): Promise<{
  ok: boolean;
  message: string;
  orderId?: string;
}> {
  const cart = await loadCart();
  if (cart.status === "unavailable") return { ok: false, message: storeCopy.cartUnavailable };
  if (cart.lines.length === 0) return { ok: false, message: storeCopy.checkoutEmpty };

  const actor = await getCurrentActor();
  if (actor) {
    const verified = requireVerifiedEmail(actor);
    if (!verified.ok) return { ok: false, message: verified.error.message };
  }

  let guestAddress: unknown = null;
  if (!actor) {
    const guest = parseTrusted(guestAddressSchema, {
      label: raw.label ?? "",
      recipientName: raw.recipientName,
      phone: raw.phone,
      province: raw.province,
      city: raw.city,
      line1: raw.line1,
      postalCode: raw.postalCode,
      isDefault: false,
    });
    if (!guest.ok) return { ok: false, message: guest.error.message };
    guestAddress = guest.data;
  }

  const emailResult = emailSchema.safeParse(actor?.email ?? raw.guestEmail);
  if (!emailResult.success) return { ok: false, message: authCopy.unauthenticated };

  const db = await getDb();
  if (!db) return { ok: false, message: storeCopy.checkoutUnavailable };

  const rpc = db.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;

  const result = await rpc("place_order", {
    idempotencyKey: typeof raw.idempotencyKey === "string" ? raw.idempotencyKey : null,
    shippingMethodCode: typeof raw.shippingMethodCode === "string" ? raw.shippingMethodCode : null,
    couponCode: typeof raw.couponCode === "string" && raw.couponCode ? raw.couponCode : null,
    addressId: typeof raw.addressId === "string" ? raw.addressId : null,
    guestAddress,
    guestEmail: actor ? null : emailResult.data,
  });

  const orderId = readOrderId(result.data);
  if (result.error || !orderId) {
    return { ok: false, message: storeCopy.checkoutUnavailable };
  }
  return { ok: true, message: storeCopy.saved, orderId };
}

function readOrderId(data: unknown): string | null {
  if (typeof data === "string" && data.length > 0) return data;
  if (data && typeof data === "object" && "id" in data && typeof data.id === "string") {
    return data.id;
  }
  return null;
}
