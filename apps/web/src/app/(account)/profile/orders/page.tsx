import Link from "next/link";
import { Price } from "@ecom/ui/components/price";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { listOwnOrders } from "@/features/orders/server";
import { storeCopy } from "@/messages/fa";

export default async function ProfileOrdersPage() {
  const result = await listOwnOrders();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{storeCopy.orders}</h1>
      {result.status !== "ready" ? (
        <EmptyState description={storeCopy.ordersUnavailable} title={storeCopy.orders} />
      ) : result.orders.length === 0 ? (
        <EmptyState description={storeCopy.ordersEmptyBody} title={storeCopy.ordersEmptyTitle} />
      ) : (
        <ul className="flex flex-col gap-3">
          {result.orders.map((order) => (
            <li key={order.id}>
              <Link className="flex flex-wrap justify-between gap-3 rounded-xl border p-4" href={`/orders/${order.id}`}>
                <span>{order.number}</span>
                <Price amountRial={order.totalRial} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
