import type { Metadata } from "next";
import Link from "next/link";
import { Price } from "@ecom/ui/components/price";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { loadCardsBySlugs } from "@/features/catalog/data/catalog-store";
import { parseCompareSlugs } from "@/features/catalog/domain";
import { storeMetadata } from "@/lib/seo/site";
import { storeCopy } from "@/messages/fa";

export const metadata: Metadata = storeMetadata({
  title: storeCopy.compare,
  description: storeCopy.compareEmptyBody,
  path: "/compare",
  index: false,
});

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { slugs, dropped } = parseCompareSlugs(params.p);
  const products = await loadCardsBySlugs(slugs);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{storeCopy.compare}</h1>
      {dropped ? (
        <p role="status" className="text-sm">
          {storeCopy.compareDropped}
        </p>
      ) : null}
      {products.length === 0 ? (
        <EmptyState
          action={
            <Link href="/products">{storeCopy.browseProducts}</Link>
          }
          description={storeCopy.compareEmptyBody}
          title={storeCopy.compareEmptyTitle}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr>
                <th className="p-3 text-start">{storeCopy.products}</th>
                {products.map((product) => (
                  <th className="p-3 text-start font-medium" key={product.id}>
                    <Link href={`/products/${product.slug}`}>{product.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <th className="p-3 text-start font-normal">{storeCopy.brands}</th>
                {products.map((product) => (
                  <td className="p-3" key={product.id}>
                    {product.brandName ?? "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <th className="p-3 text-start font-normal">{storeCopy.unitPrice}</th>
                {products.map((product) => (
                  <td className="p-3" key={product.id}>
                    <Price amountRial={product.priceRial} />
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <th className="p-3 text-start font-normal">{storeCopy.inStock}</th>
                {products.map((product) => (
                  <td className="p-3" key={product.id}>
                    {product.stock === "in_stock"
                      ? storeCopy.inStock
                      : product.stock === "out_of_stock"
                        ? storeCopy.outOfStock
                        : storeCopy.stockUnknown}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
