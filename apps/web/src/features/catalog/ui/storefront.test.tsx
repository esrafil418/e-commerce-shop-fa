import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));
import { HomeContent } from "@/features/catalog/ui/home-content";
import { ProductCard } from "@/features/catalog/ui/product-card";
import type { HomeModel } from "@/features/catalog/types";
import { siteCopy, storeCopy } from "@/messages/fa";

const unavailable: HomeModel = {
  status: "unavailable",
  categories: [],
  brands: [],
  featured: [],
  discounted: [],
  popular: [],
  banners: [],
};

describe("storefront home", () => {
  it("shows the Persian hero without inventing products", () => {
    render(<HomeContent model={unavailable} query="" />);
    expect(screen.getByRole("heading", { level: 1, name: siteCopy.heroTitle })).toBeInTheDocument();
    expect(screen.getByText(storeCopy.catalogUnavailableTitle)).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("keeps an unmatched search honest", () => {
    render(<HomeContent model={unavailable} query="کتاب" />);
    expect(screen.getByText(/کتاب/)).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});

describe("product card", () => {
  it("shows toman price and a separate wishlist control", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ids: [] }) })),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ProductCard
          product={{
            id: "p1",
            slug: "sample",
            name: "هدفون",
            brandName: "برند",
            brandSlug: "brand",
            image: null,
            priceRial: 25_000_000,
            compareAtPriceRial: 30_000_000,
            discountPercent: 17,
            rating: 4,
            reviewCount: 2,
            stock: "in_stock",
            defaultVariantId: "v1",
          }}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: /هدفون/ })).toHaveAttribute("href", "/products/sample");
    expect(screen.getByText("۲٬۵۰۰٬۰۰۰ تومان")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: storeCopy.wishlistAdd })).toBeInTheDocument();
  });
});
