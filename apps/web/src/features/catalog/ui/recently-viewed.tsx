"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/features/catalog/ui/product-card";
import { storeCopy } from "@/messages/fa";
import type { CatalogCard } from "../types";

const key = "recently-viewed:v1";
const limit = 12;

export function rememberProduct(slug: string) {
  const current = readSlugs().filter((item) => item !== slug);
  window.localStorage.setItem(key, JSON.stringify([slug, ...current].slice(0, limit)));
}

export function readSlugs(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is string => typeof item === "string").slice(0, limit);
  } catch {
    return [];
  }
}

export function RecentlyViewed({ exclude }: { exclude?: string }) {
  const [products, setProducts] = useState<CatalogCard[]>([]);

  useEffect(() => {
    const slugs = readSlugs().filter((slug) => slug !== exclude).slice(0, 8);
    if (slugs.length === 0) return;
    void fetch(`/api/catalog/cards?slugs=${encodeURIComponent(slugs.join(","))}`)
      .then(async (response) => {
        if (!response.ok) return { products: [] as CatalogCard[] };
        return (await response.json()) as { products?: CatalogCard[] };
      })
      .then((body) => setProducts(body.products ?? []))
      .catch(() => setProducts([]));
  }, [exclude]);

  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{storeCopy.recentlyViewed}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <Link className="sr-only" href="/products">
        {storeCopy.products}
      </Link>
    </section>
  );
}

export function RecordView({ slug }: { slug: string }) {
  useEffect(() => {
    rememberProduct(slug);
  }, [slug]);
  return null;
}
