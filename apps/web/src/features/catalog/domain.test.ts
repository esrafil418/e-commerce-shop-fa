import { describe, expect, it } from "vitest";
import { buildCloudinaryUrl } from "@/lib/cloudinary/delivery";
import { catalogTagsFor } from "@/lib/cache/tags";
import { ROBOTS_DISALLOW } from "@/lib/seo/robots-policy";
import {
  applyListing,
  discountPercent,
  isIndexableListing,
  parseCompareSlugs,
  tomanQueryToRial,
} from "@/features/catalog/domain";
import { buildProductJsonLd } from "@/features/catalog/seo/product-json-ld";
import { toggleSaved } from "@/features/wishlist/toggle";
import type { RichCard } from "@/features/catalog/types";
import { readCatalogQuery } from "@/lib/search-params";

const card = (overrides: Partial<RichCard>): RichCard => ({
  id: "1",
  slug: "a",
  name: "کالا",
  brandName: null,
  brandSlug: null,
  image: null,
  priceRial: 10_000_000,
  compareAtPriceRial: null,
  discountPercent: null,
  rating: null,
  reviewCount: 0,
  stock: "in_stock",
  defaultVariantId: "v",
  publishedAt: 1,
  ...overrides,
});

describe("catalog domain", () => {
  it("converts toman query bounds to rials", () => {
    expect(tomanQueryToRial(250_000)).toBe(2_500_000);
  });

  it("computes a display discount without treating compare-at as the sale price", () => {
    expect(discountPercent(25_000_000, 30_000_000)).toBe(17);
    expect(discountPercent(25_000_000, 20_000_000)).toBeNull();
  });

  it("drops a fifth compare slug", () => {
    const result = parseCompareSlugs(["a", "b", "c", "d", "e"]);
    expect(result.slugs).toEqual(["a", "b", "c", "d"]);
    expect(result.dropped).toBe(true);
  });

  it("excludes products outside the price bound", () => {
    const listing = applyListing(
      [card({ id: "low", slug: "low", priceRial: 1_000_000 }), card({ id: "high", slug: "high", priceRial: 50_000_000 })],
      readCatalogQuery({ min: "200000" }),
    );
    expect(listing.items.map((item) => item.slug)).toEqual(["high"]);
  });

  it("does not index filtered listings", () => {
    expect(isIndexableListing(readCatalogQuery({}))).toBe(true);
    expect(isIndexableListing(readCatalogQuery({ sort: "price_asc" }))).toBe(false);
  });
});

describe("product json-ld", () => {
  it("uses IRR and the rial amount", () => {
    const data = buildProductJsonLd({
      name: "هدفون",
      description: "توضیح",
      sku: "SKU-1",
      image: null,
      priceRial: 25_000_000,
      inStock: true,
      url: "http://localhost:3000/products/sample",
    });
    expect(data.offers.priceCurrency).toBe("IRR");
    expect(data.offers.price).toBe(25_000_000);
    expect(data.offers.availability).toBe("https://schema.org/InStock");
  });
});

describe("robots", () => {
  it("hides admin and checkout", () => {
    expect(ROBOTS_DISALLOW).toContain("/admin");
    expect(ROBOTS_DISALLOW).toContain("/checkout");
  });
});

describe("cloudinary delivery", () => {
  it("includes a width and f_auto", () => {
    expect(buildCloudinaryUrl("demo", "folder/item", 640)).toContain("f_auto");
    expect(buildCloudinaryUrl("demo", "folder/item", 640)).toContain("w_640");
  });
});

describe("cache tags", () => {
  it("lists the public catalog tags for a product", () => {
    expect(catalogTagsFor({ slug: "sample", categorySlug: "audio" })).toEqual([
      "catalog",
      "home",
      "product:sample",
      "category:audio",
    ]);
  });
});

describe("wishlist toggle", () => {
  it("adds and removes an id", () => {
    expect(toggleSaved(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleSaved(["a", "b"], "b")).toEqual(["a"]);
  });
});
