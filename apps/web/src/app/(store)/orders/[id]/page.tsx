import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Price } from "@ecom/ui/components/price";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { loadOwnOrder, loadTrackedOrder } from "@/features/orders/server";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return storeMetadata({
    title: storeCopy.orders,
    description: storeCopy.orders,
    path: `/orders/${id}`,
    index: false,
  });
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const tracked = (await cookies()).get("tracked_order")?.value;
  const owned = await loadOwnOrder(id);
  const result = owned.status === "guest" && tracked === id ? await loadTrackedOrder(id) : owned;
  if (result.status === "missing") notFound();
  if (result.status !== "ready") {
    return (
      <EmptyState
        description={result.status === "guest" ? storeCopy.trackMiss : storeCopy.ordersUnavailable}
        heading="h1"
        title={storeCopy.orders}
      />
    );
  }

  const { order } = result;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{order.number}</h1>
      <p>
        {storeCopy.orderStatus}: {order.status}
      </p>
      <p>
        {storeCopy.orderTotal} <Price amountRial={order.totalRial} />
      </p>
      <ul className="flex flex-col gap-3">
        {order.items.map((item) => (
          <li className="rounded-xl border p-4" key={item.id}>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.sku}</p>
            <p className="text-sm">
              {storeCopy.quantity} {new Intl.NumberFormat("fa-IR").format(item.quantity)}
            </p>
            <Price amountRial={item.unitPriceRial} />
          </li>
        ))}
      </ul>
    </div>
  );
}
