import "server-only";

import { getCurrentActor } from "@/lib/auth/current-user";
import {
  getDb,
  num,
  query,
  readMaybe,
  readRows,
  str,
} from "@/features/catalog/data/db";

export type OrderSummary = {
  id: string;
  number: string;
  status: string;
  totalRial: number;
  placedAt: string;
};

export type OrderDetail = OrderSummary & {
  email: string;
  shippingRial: number;
  discountRial: number;
  items: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPriceRial: number;
  }[];
};

export async function listOwnOrders(): Promise<
  { status: "ready"; orders: OrderSummary[] } | { status: "unavailable" } | { status: "guest" }
> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "guest" };
  const db = await getDb();
  if (!db) return { status: "unavailable" };
  const rows = await readRows(
    query(db, "orders", "id, number, status, total_rial, placed_at")
      .eq("user_id", actor.userId)
      .order("placed_at", { ascending: false })
      .limit(50),
  );
  if (rows === "missing") return { status: "unavailable" };
  return {
    status: "ready",
    orders: rows.map((row) => ({
      id: str(row, "id"),
      number: str(row, "number"),
      status: str(row, "status"),
      totalRial: num(row, "total_rial") ?? 0,
      placedAt: str(row, "placed_at"),
    })),
  };
}

export async function loadOwnOrder(id: string): Promise<
  | { status: "ready"; order: OrderDetail }
  | { status: "missing" }
  | { status: "unavailable" }
  | { status: "guest" }
> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "guest" };
  const db = await getDb();
  if (!db) return { status: "unavailable" };
  const row = await readMaybe(
    query(db, "orders", "id, number, status, total_rial, shipping_rial, discount_rial, placed_at, email, user_id")
      .eq("id", id)
      .eq("user_id", actor.userId)
      .maybeSingle(),
  );
  if (row === "missing") return { status: "unavailable" };
  if (!row) return { status: "missing" };
  const items = await readRows(
    query(db, "order_items", "id, name_snapshot, sku_snapshot, quantity, unit_price_rial").eq(
      "order_id",
      id,
    ),
  );
  return {
    status: "ready",
    order: {
      id: str(row, "id"),
      number: str(row, "number"),
      status: str(row, "status"),
      totalRial: num(row, "total_rial") ?? 0,
      shippingRial: num(row, "shipping_rial") ?? 0,
      discountRial: num(row, "discount_rial") ?? 0,
      placedAt: str(row, "placed_at"),
      email: str(row, "email"),
      items:
        items === "missing"
          ? []
          : items.map((item) => ({
              id: str(item, "id"),
              name: str(item, "name_snapshot"),
              sku: str(item, "sku_snapshot"),
              quantity: num(item, "quantity") ?? 0,
              unitPriceRial: num(item, "unit_price_rial") ?? 0,
            })),
    },
  };
}

export async function trackOrder(
  number: string,
  email: string,
): Promise<{ id: string; number: string; status: string; totalRial: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await readRows(
    query(db, "orders", "id, number, email, status, total_rial").eq("number", number).limit(1),
  );
  if (rows === "missing" || !rows[0]) return null;
  if (str(rows[0], "email").toLowerCase() !== email.toLowerCase()) return null;
  return {
    id: str(rows[0], "id"),
    number: str(rows[0], "number"),
    status: str(rows[0], "status"),
    totalRial: num(rows[0], "total_rial") ?? 0,
  };
}

export async function loadTrackedOrder(id: string) {
  const db = await getDb();
  if (!db) return { status: "unavailable" as const };
  const row = await readMaybe(
    query(db, "orders", "id, number, status, total_rial, shipping_rial, discount_rial, placed_at, email")
      .eq("id", id)
      .maybeSingle(),
  );
  if (row === "missing") return { status: "unavailable" as const };
  if (!row) return { status: "missing" as const };
  const items = await readRows(
    query(db, "order_items", "id, name_snapshot, sku_snapshot, quantity, unit_price_rial").eq(
      "order_id",
      id,
    ),
  );
  return {
    status: "ready" as const,
    order: {
      id: str(row, "id"),
      number: str(row, "number"),
      status: str(row, "status"),
      totalRial: num(row, "total_rial") ?? 0,
      shippingRial: num(row, "shipping_rial") ?? 0,
      discountRial: num(row, "discount_rial") ?? 0,
      placedAt: str(row, "placed_at"),
      email: str(row, "email"),
      items:
        items === "missing"
          ? []
          : items.map((item) => ({
              id: str(item, "id"),
              name: str(item, "name_snapshot"),
              sku: str(item, "sku_snapshot"),
              quantity: num(item, "quantity") ?? 0,
              unitPriceRial: num(item, "unit_price_rial") ?? 0,
            })),
    },
  };
}
