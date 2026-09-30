import type { Metadata } from "next";
import Link from "next/link";
import { Price } from "@ecom/ui/components/price";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { TrackOrderForm } from "@/features/orders/ui/track-order-form";
import { listOwnOrders } from "@/features/orders/server";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export const metadata: Metadata = storeMetadata({
  title: storeCopy.orders,
  description: storeCopy.ordersEmptyBody,
  path: "/orders",
  index: false,
});

export default async function OrdersPage() {
  const result = await listOwnOrders();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{storeCopy.orders}</h1>
      <TrackOrderForm />
      {result.status === "guest" ? null : result.status === "unavailable" ? (
        <EmptyState description={storeCopy.ordersUnavailable} title={storeCopy.orders} />
      ) : result.orders.length === 0 ? (
        <EmptyState description={storeCopy.ordersEmptyBody} title={storeCopy.ordersEmptyTitle} />
      ) : (
        <ul className="flex flex-col gap-3">
          {result.orders.map((order) => (
            <li key={order.id}>
              <Link className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" href={`/orders/${order.id}`}>
                <span>{order.number}</span>
                <span>{order.status}</span>
                <Price amountRial={order.totalRial} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
