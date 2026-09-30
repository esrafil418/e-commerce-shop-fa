export function buildProductJsonLd(input: {
  name: string;
  description: string;
  sku: string | null;
  image: string | null;
  priceRial: number;
  inStock: boolean;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku ?? undefined,
    image: input.image ?? undefined,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "IRR",
      price: input.priceRial,
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
