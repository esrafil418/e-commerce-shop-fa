import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { Rating } from "@ecom/ui/components/rating";
import { ProductCard } from "@/features/catalog/ui/product-card";
import { ProductView } from "@/features/catalog/ui/product-view";
import { RecordView, RecentlyViewed } from "@/features/catalog/ui/recently-viewed";
import { loadProduct } from "@/features/catalog/data/catalog-store";
import { buildProductJsonLd, jsonLdScript } from "@/features/catalog/seo/product-json-ld";
import { deliveryUrl } from "@/lib/cloudinary/delivery";
import { absoluteUrl, storeMetadata } from "@/lib/seo/site";
import { storeCopy, siteCopy } from "@/messages/fa";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadProduct(slug);
  if (result.status !== "ready") {
    return storeMetadata({
      title: storeCopy.products,
      description: storeCopy.catalogUnavailableBody,
      path: `/products/${slug}`,
      index: false,
    });
  }
  const image = result.product.gallery[0] ?? result.product.card.image;
  return storeMetadata({
    title: result.product.card.name,
    description: result.product.description || result.product.card.name,
    path: `/products/${result.product.card.slug}`,
    image: image ? deliveryUrl(image.publicId, 1200, image.kind) : null,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const result = await loadProduct(slug);
  if (result.status === "missing") notFound();
  if (result.status === "unavailable") {
    return (
      <EmptyState
        description={storeCopy.catalogUnavailableBody}
        heading="h1"
        title={storeCopy.catalogUnavailableTitle}
      />
    );
  }

  const { product } = result;
  const image = product.gallery[0] ?? product.card.image;
  const jsonLd = buildProductJsonLd({
    name: product.card.name,
    description: product.description || product.card.name,
    sku: product.variants[0]?.sku ?? null,
    image: image ? deliveryUrl(image.publicId, 1200, image.kind) : null,
    priceRial: product.variants[0]?.priceRial ?? product.card.priceRial,
    inStock: product.card.stock === "in_stock",
    url: absoluteUrl(`/products/${product.card.slug}`),
  });

  return (
    <div className="flex flex-col gap-10">
      <script
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
        type="application/ld+json"
      />
      <RecordView slug={product.card.slug} />
      <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/">{siteCopy.home}</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/products">{storeCopy.products}</Link>
        <span aria-hidden="true"> / </span>
        <span>{product.card.name}</span>
      </nav>
      <ProductView product={product} />
      {product.description ? (
        <section className="max-w-3xl">
          <h2 className="text-xl font-semibold">{storeCopy.description}</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7">{product.description}</p>
        </section>
      ) : null}
      {product.specifications.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold">{storeCopy.specifications}</h2>
          {product.specifications.map((group) => (
            <div className="mt-4" key={group.name}>
              <h3 className="text-sm font-medium">{group.name}</h3>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {group.rows.map((row) => (
                    <tr className="border-b" key={`${row.name}-${row.value}`}>
                      <th className="py-2 pe-4 text-start font-normal text-muted-foreground">{row.name}</th>
                      <td className="py-2">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ) : null}
      <section>
        <h2 className="text-xl font-semibold">{storeCopy.reviews}</h2>
        {product.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{storeCopy.noReviews}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {product.reviews.map((review) => (
              <li className="rounded-xl border p-4" key={review.id}>
                <Rating value={review.rating} />
                {review.body ? <p className="mt-2 whitespace-pre-wrap text-sm">{review.body}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {product.related.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{storeCopy.related}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {product.related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
      <RecentlyViewed exclude={product.card.slug} />
    </div>
  );
}
