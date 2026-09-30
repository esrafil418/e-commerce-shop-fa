import type { CatalogQuery, CatalogSort } from "@ecom/validation";
import { RIALS_PER_TOMAN } from "@/lib/currency";
import type { CatalogCard, RichCard, StockState } from "./types";

export const STORE_PAGE_SIZE = 24;
export const CATALOG_CANDIDATE_LIMIT = 500;
export const LOW_STOCK_THRESHOLD = 3;
export const COMPARE_LIMIT = 4;

export function tomanQueryToRial(toman: number | undefined): number | undefined {
  if (toman == null) {
    return undefined;
  }
  const rial = toman * RIALS_PER_TOMAN;
  if (!Number.isSafeInteger(rial)) {
    return undefined;
  }
  return rial;
}

export function discountPercent(
  priceRial: number,
  compareAtPriceRial: number | null,
): number | null {
  if (
    compareAtPriceRial == null ||
    compareAtPriceRial <= priceRial ||
    compareAtPriceRial <= 0
  ) {
    return null;
  }
  return Math.round(((compareAtPriceRial - priceRial) / compareAtPriceRial) * 100);
}

export function stockFromAvailable(available: number | null, known: boolean): StockState {
  if (!known || available == null) {
    return "unknown";
  }
  return available > 0 ? "in_stock" : "out_of_stock";
}

export function isIndexableListing(query: CatalogQuery): boolean {
  return (
    query.q.length === 0 &&
    query.page === 1 &&
    query.sort === "newest" &&
    !query.inStock &&
    query.brand.length === 0 &&
    query.attr.length === 0 &&
    query.min == null &&
    query.max == null &&
    query.category.length === 0
  );
}

export function listingHref(
  pathname: string,
  query: CatalogQuery,
  page: number,
): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));
  if (query.min != null) params.set("min", String(query.min));
  if (query.max != null) params.set("max", String(query.max));
  if (query.inStock) params.set("inStock", "1");
  for (const brand of query.brand) params.append("brand", brand);
  for (const attr of query.attr) params.append("attr", attr);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function parseCompareSlugs(raw: string | string[] | undefined): {
  slugs: string[];
  dropped: boolean;
} {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const slugs = values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= 80);
  const unique: string[] = [];
  for (const slug of slugs) {
    if (!unique.includes(slug)) unique.push(slug);
  }
  return {
    slugs: unique.slice(0, COMPARE_LIMIT),
    dropped: unique.length > COMPARE_LIMIT,
  };
}

export function safeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) {
    return href;
  }
  try {
    const url = new URL(href);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function compareCards(left: RichCard, right: RichCard, sort: CatalogSort): number {
  if (sort === "price_asc" || sort === "price_desc") {
    const diff = left.priceRial - right.priceRial;
    if (diff !== 0) return sort === "price_asc" ? diff : -diff;
  } else if (left.publishedAt !== right.publishedAt) {
    return right.publishedAt - left.publishedAt;
  }
  return left.slug.localeCompare(right.slug);
}

export function applyListing(
  cards: RichCard[],
  query: CatalogQuery,
): { items: CatalogCard[]; total: number } {
  const minRial = tomanQueryToRial(query.min);
  const maxRial = tomanQueryToRial(query.max);
  const filtered = cards.filter((card) => {
    if (minRial != null && card.priceRial < minRial) return false;
    if (maxRial != null && card.priceRial > maxRial) return false;
    if (query.inStock && card.stock !== "in_stock") return false;
    return true;
  });
  const sorted = filtered.slice().sort((left, right) => compareCards(left, right, query.sort));
  const start = (query.page - 1) * STORE_PAGE_SIZE;
  return {
    total: sorted.length,
    items: sorted.slice(start, start + STORE_PAGE_SIZE).map(stripPublishedAt),
  };
}

export function stripPublishedAt(card: RichCard): CatalogCard {
  return {
    id: card.id,
    slug: card.slug,
    name: card.name,
    brandName: card.brandName,
    brandSlug: card.brandSlug,
    image: card.image,
    priceRial: card.priceRial,
    compareAtPriceRial: card.compareAtPriceRial,
    discountPercent: card.discountPercent,
    rating: card.rating,
    reviewCount: card.reviewCount,
    stock: card.stock,
    defaultVariantId: card.defaultVariantId,
  };
}

export function searchPattern(query: string): string {
  const cleaned = query.replace(/[%_,]/g, " ").trim();
  return `%${cleaned}%`;
}
