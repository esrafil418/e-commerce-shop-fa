import "server-only";

import { cache } from "react";
import type { CatalogQuery } from "@ecom/validation";
import { siteCopy } from "@/messages/fa";
import {
  applyListing,
  CATALOG_CANDIDATE_LIMIT,
  discountPercent,
  safeHref,
  searchPattern,
  stockFromAvailable,
  STORE_PAGE_SIZE,
  stripPublishedAt,
} from "../domain";
import type {
  BrandSummary,
  CatalogCard,
  CategorySummary,
  HomeModel,
  ListingResult,
  MediaAsset,
  OptionGroup,
  ProductDetail,
  ReviewItem,
  RichCard,
  SitemapEntry,
  SpecGroup,
  StoreBanner,
  SuggestHit,
  VariantChoice,
} from "../types";
import { getDb, num, query, readMaybe, readRows, str, type Db } from "./db";

const PRODUCT_COLUMNS =
  "id, brand_id, primary_category_id, name_fa, slug, published_at, updated_at, status";

type Scope = {
  categoryIds?: string[];
  extraProductIds?: string[];
  brandId?: string;
  q?: string;
  productIds?: string[];
  slugs?: string[];
};

function emptyListing(status: ListingResult["status"], page: number): ListingResult {
  return { status, items: [], total: 0, page, pageSize: STORE_PAGE_SIZE };
}

function emptyHome(status: HomeModel["status"]): HomeModel {
  return {
    status,
    categories: [],
    brands: [],
    featured: [],
    discounted: [],
    popular: [],
    banners: [],
  };
}

export const loadHome = cache(async (): Promise<HomeModel> => {
  const db = await getDb();
  if (!db) return emptyHome("unavailable");

  const products = await readRows(
    query(db, "products", PRODUCT_COLUMNS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(CATALOG_CANDIDATE_LIMIT),
  );
  if (products === "missing") return emptyHome("unavailable");

  const [categoryRows, brandRows, banners, sections, cards] = await Promise.all([
    loadCategories(db),
    loadBrands(db),
    loadBanners(db),
    loadFeaturedSlugs(db),
    hydrate(db, products),
  ]);
  const categories = categoryRows === "missing" ? [] : categoryRows;
  const brands = brandRows === "missing" ? [] : brandRows;

  const published = cards.slice().sort((left, right) => right.publishedAt - left.publishedAt);
  const featuredPool =
    sections.length > 0
      ? published.filter((card) => sections.includes(card.slug))
      : published.slice(0, 8);
  const discounted = published.filter(
    (card) => card.compareAtPriceRial != null && card.compareAtPriceRial > card.priceRial,
  );

  return {
    status: "ready",
    categories,
    brands,
    featured: featuredPool.slice(0, 8).map(stripPublishedAt),
    discounted: discounted.slice(0, 8).map(stripPublishedAt),
    popular: published.slice(8, 16).map(stripPublishedAt),
    banners,
  };
});

export async function loadBrandsForFilters(): Promise<BrandSummary[]> {
  const db = await getDb();
  if (!db) return [];
  return brandsOrEmpty(db);
}

export async function loadListing(
  queryInput: CatalogQuery,
  scope: Scope = {},
): Promise<ListingResult> {
  const db = await getDb();
  if (!db) return emptyListing("unavailable", queryInput.page);

  let request = query(db, "products", PRODUCT_COLUMNS).eq("status", "published");
  if (scope.brandId) request = request.eq("brand_id", scope.brandId);
  if (scope.q) request = request.ilike("name_fa", searchPattern(scope.q));
  if (scope.productIds && scope.productIds.length === 0) {
    return emptyListing("ready", queryInput.page);
  }
  if (scope.productIds && scope.productIds.length > 0) {
    request = request.in("id", scope.productIds);
  }
  if (scope.slugs && scope.slugs.length === 0) return emptyListing("ready", queryInput.page);
  if (scope.slugs && scope.slugs.length > 0) request = request.in("slug", scope.slugs);

  const rows = await readRows(
    request.order("published_at", { ascending: false }).limit(CATALOG_CANDIDATE_LIMIT),
  );
  if (rows === "missing") return emptyListing("unavailable", queryInput.page);

  const categoryIds = scope.categoryIds;
  const allowed = new Set(scope.extraProductIds ?? []);
  const scoped = categoryIds
    ? rows.filter((row) => {
        const id = str(row, "id");
        const primary = str(row, "primary_category_id");
        return categoryIds.includes(primary) || allowed.has(id);
      })
    : rows;

  const attributeIds = queryInput.attr;
  const attrFiltered = attributeIds.length
    ? await filterByAttributes(db, scoped, attributeIds)
    : scoped;
  const cards = await hydrate(db, attrFiltered);
  const page = applyListing(cards, queryInput);
  return {
    status: "ready",
    items: page.items,
    total: page.total,
    page: queryInput.page,
    pageSize: STORE_PAGE_SIZE,
  };
}

export async function loadCategoryPage(slug: string, queryInput: CatalogQuery) {
  const db = await getDb();
  if (!db) return { status: "unavailable" as const };
  const categories = await loadCategories(db);
  if (categories === "missing") return { status: "unavailable" as const };
  const category = categories.find((item) => item.slug === slug);
  if (!category) return { status: "missing" as const };
  const ids = descendantIds(categories, category);
  const extra = await productIdsInCategories(db, ids);
  const listing = await loadListing(queryInput, {
    categoryIds: ids,
    extraProductIds: extra,
    q: queryInput.q,
  });
  const ancestors = ancestorChain(categories, category);
  return { status: "ready" as const, category, ancestors, listing, brands: await brandsOrEmpty(db) };
}

export async function loadBrandPage(slug: string, queryInput: CatalogQuery) {
  const db = await getDb();
  if (!db) return { status: "unavailable" as const };
  const brands = await loadBrands(db);
  if (brands === "missing") return { status: "unavailable" as const };
  const brand = brands.find((item) => item.slug === slug);
  if (!brand) return { status: "missing" as const };
  const listing = await loadListing(queryInput, { brandId: brand.id, q: queryInput.q });
  return { status: "ready" as const, brand, listing };
}

export async function loadProduct(slug: string): Promise<
  | { status: "unavailable" }
  | { status: "missing" }
  | { status: "ready"; product: ProductDetail }
> {
  const db = await getDb();
  if (!db) return { status: "unavailable" };
  const row = await readMaybe(
    query(db, "products", `${PRODUCT_COLUMNS}, description_fa`)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle(),
  );
  if (row === "missing") return { status: "unavailable" };
  if (!row) return { status: "missing" };

  const cards = await hydrate(db, [row]);
  const card = cards[0];
  if (!card) return { status: "missing" };

  const productId = str(row, "id");
  const [variants, options, specifications, gallery, reviews, related] = await Promise.all([
    loadVariants(db, productId),
    loadOptions(db, productId),
    loadSpecs(db, productId),
    loadGallery(db, productId, str(row, "name_fa")),
    loadReviews(db, productId),
    loadRelated(db, productId),
  ]);

  return {
    status: "ready",
    product: {
      card: stripPublishedAt(card),
      description: str(row, "description_fa"),
      variants,
      options,
      specifications,
      gallery,
      reviews,
      related,
      sellerName: siteCopy.name,
    },
  };
}

export async function loadCardsBySlugs(slugs: string[]): Promise<CatalogCard[]> {
  const unique = slugs.filter((slug, index) => slugs.indexOf(slug) === index).slice(0, 12);
  if (unique.length === 0) return [];
  const listing = await loadListing(
    { q: "", sort: "newest", page: 1, category: "", brand: [], attr: [], inStock: false },
    { slugs: unique },
  );
  const bySlug = new Map(listing.items.map((item) => [item.slug, item]));
  return unique.flatMap((slug) => {
    const card = bySlug.get(slug);
    return card ? [card] : [];
  });
}

export async function suggest(term: string): Promise<SuggestHit[]> {
  const q = term.trim().slice(0, 80);
  if (q.length < 2) return [];
  const listing = await loadListing(
    { q, sort: "newest", page: 1, category: "", brand: [], attr: [], inStock: false },
    { q },
  );
  const products = listing.items.slice(0, 6).map((item) => ({
    label: item.name,
    href: `/products/${item.slug}`,
  }));
  const db = await getDb();
  if (!db) return products;
  const categories = await loadCategories(db);
  const categoryHits =
    categories === "missing"
      ? []
      : categories
          .filter((category) => category.name.includes(q))
          .slice(0, 3)
          .map((category) => ({
            label: category.name,
            href: `/categories/${category.slug}`,
          }));
  return [...categoryHits, ...products].slice(0, 8);
}

export async function listSitemapEntries(): Promise<SitemapEntry[]> {
  const home: SitemapEntry[] = [
    { path: "/" },
    { path: "/products" },
    { path: "/categories" },
  ];
  const db = await getDb();
  if (!db) return home;
  const rows = await readRows(
    query(db, "products", "slug, updated_at, published_at")
      .eq("status", "published")
      .limit(CATALOG_CANDIDATE_LIMIT),
  );
  if (rows === "missing") return home;
  const categories = await loadCategories(db);
  const brands = await loadBrands(db);
  return [
    ...home,
    ...(categories === "missing"
      ? []
      : categories.map((category) => ({ path: `/categories/${category.slug}` }))),
    ...(brands === "missing" ? [] : brands.map((brand) => ({ path: `/brands/${brand.slug}` }))),
    ...rows.map((row) => ({
      path: `/products/${str(row, "slug")}`,
      lastModified: str(row, "updated_at") || str(row, "published_at") || undefined,
    })),
  ];
}

async function brandsOrEmpty(db: Db): Promise<BrandSummary[]> {
  const brands = await loadBrands(db);
  return brands === "missing" ? [] : brands;
}

async function loadCategories(db: Db): Promise<CategorySummary[] | "missing"> {
  const rows = await readRows(
    query(db, "categories", "id, parent_id, name_fa, slug, path, position, is_active")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .limit(CATALOG_CANDIDATE_LIMIT),
  );
  if (rows === "missing") return "missing";
  return rows.map((row) => ({
    id: str(row, "id"),
    slug: str(row, "slug"),
    name: str(row, "name_fa"),
    parentId: str(row, "parent_id") || null,
    path: str(row, "path"),
  }));
}

async function loadBrands(db: Db): Promise<BrandSummary[] | "missing"> {
  const rows = await readRows(
    query(db, "brands", "id, name_fa, slug, logo_public_id, is_active")
      .eq("is_active", true)
      .order("name_fa", { ascending: true })
      .limit(CATALOG_CANDIDATE_LIMIT),
  );
  if (rows === "missing") return "missing";
  return rows.map((row) => ({
    id: str(row, "id"),
    slug: str(row, "slug"),
    name: str(row, "name_fa"),
    logoPublicId: str(row, "logo_public_id") || null,
  }));
}

async function loadBanners(db: Db): Promise<StoreBanner[]> {
  const rows = await readRows(
    query(db, "banners", "id, title_fa, href, image_public_id, position, is_active")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .limit(8),
  );
  if (rows === "missing") return [];
  return rows.flatMap((row) => {
    const href = safeHref(str(row, "href"));
    if (!href) return [];
    return [
      {
        id: str(row, "id"),
        title: str(row, "title_fa"),
        href,
        imagePublicId: str(row, "image_public_id") || null,
      },
    ];
  });
}

async function loadFeaturedSlugs(db: Db): Promise<string[]> {
  const rows = await readRows(
    query(db, "homepage_sections", "kind, config, position, is_active")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .limit(20),
  );
  if (rows === "missing") return [];
  const slugs: string[] = [];
  for (const row of rows) {
    if (str(row, "kind") !== "featured") continue;
    const config = row.config;
    if (!config || typeof config !== "object" || Array.isArray(config)) continue;
    const list = (config as { product_slugs?: unknown }).product_slugs;
    if (!Array.isArray(list)) continue;
    for (const slug of list) {
      if (typeof slug === "string") slugs.push(slug);
    }
  }
  return slugs;
}

async function productIdsInCategories(db: Db, categoryIds: string[]): Promise<string[]> {
  if (categoryIds.length === 0) return [];
  const rows = await readRows(
    query(db, "product_categories", "product_id, category_id").in("category_id", categoryIds),
  );
  if (rows === "missing") return [];
  return rows.map((row) => str(row, "product_id")).filter(Boolean);
}

async function filterByAttributes(
  db: Db,
  rows: Record<string, unknown>[],
  attributeValueIds: string[],
): Promise<Record<string, unknown>[]> {
  const links = await readRows(
    query(db, "product_attribute_values", "product_id, attribute_value_id").in(
      "attribute_value_id",
      attributeValueIds,
    ),
  );
  if (links === "missing") return [];
  const allowed = new Set(links.map((row) => str(row, "product_id")));
  return rows.filter((row) => allowed.has(str(row, "id")));
}

async function hydrate(db: Db, rows: Record<string, unknown>[]): Promise<RichCard[]> {
  const ids = rows.map((row) => str(row, "id")).filter(Boolean);
  if (ids.length === 0) return [];

  const [brands, variants, media, inventory, reviews] = await Promise.all([
    readRows(query(db, "brands", "id, name_fa, slug").limit(CATALOG_CANDIDATE_LIMIT)),
    readRows(
      query(db, "product_variants", "id, product_id, sku, price_rial, compare_at_price_rial, is_active")
        .in("product_id", ids)
        .eq("is_active", true),
    ),
    readRows(
      query(
        db,
        "product_media",
        "product_id, variant_id, kind, cloudinary_public_id, alt_fa, width, height, position",
      ).in("product_id", ids),
    ),
    readRows(query(db, "inventory_levels", "variant_id, on_hand, reserved").limit(2000)),
    readRows(
      query(db, "reviews", "product_id, rating, status").eq("status", "published").in("product_id", ids),
    ),
  ]);

  const brandById = new Map(
    (brands === "missing" ? [] : brands).map((row) => [
      str(row, "id"),
      { name: str(row, "name_fa"), slug: str(row, "slug") },
    ]),
  );
  const variantRows = variants === "missing" ? [] : variants;
  const mediaRows = media === "missing" ? [] : media;
  const stockKnown = inventory !== "missing";
  const stockByVariant = new Map<string, number>();
  if (stockKnown) {
    for (const row of inventory) {
      const variantId = str(row, "variant_id");
      const onHand = num(row, "on_hand") ?? 0;
      const reserved = num(row, "reserved") ?? 0;
      stockByVariant.set(variantId, (stockByVariant.get(variantId) ?? 0) + (onHand - reserved));
    }
  }
  const ratingByProduct = new Map<string, { sum: number; count: number }>();
  if (reviews !== "missing") {
    for (const row of reviews) {
      const productId = str(row, "product_id");
      const rating = num(row, "rating");
      if (rating == null) continue;
      const current = ratingByProduct.get(productId) ?? { sum: 0, count: 0 };
      current.sum += rating;
      current.count += 1;
      ratingByProduct.set(productId, current);
    }
  }

  const cards: RichCard[] = [];
  for (const row of rows) {
    const productId = str(row, "id");
    const productVariants = variantRows.filter((variant) => str(variant, "product_id") === productId);
    if (productVariants.length === 0) continue;
    const priced = productVariants
      .map((variant) => ({
        id: str(variant, "id"),
        price: num(variant, "price_rial") ?? 0,
        compare: num(variant, "compare_at_price_rial"),
      }))
      .sort((left, right) => left.price - right.price);
    const cheapest = priced[0];
    if (!cheapest) continue;
    const available = stockKnown
      ? productVariants.reduce(
          (sum, variant) => sum + (stockByVariant.get(str(variant, "id")) ?? 0),
          0,
        )
      : null;
    const images = mediaRows
      .filter((item) => str(item, "product_id") === productId && str(item, "kind") !== "video")
      .sort((left, right) => (num(left, "position") ?? 0) - (num(right, "position") ?? 0));
    const primary = images[0];
    const brand = brandById.get(str(row, "brand_id"));
    const rating = ratingByProduct.get(productId);
    const published = Date.parse(str(row, "published_at"));
    cards.push({
      id: productId,
      slug: str(row, "slug"),
      name: str(row, "name_fa"),
      brandName: brand?.name ?? null,
      brandSlug: brand?.slug ?? null,
      image: primary ? mediaFromRow(primary, str(row, "name_fa")) : null,
      priceRial: cheapest.price,
      compareAtPriceRial:
        cheapest.compare != null && cheapest.compare > cheapest.price ? cheapest.compare : null,
      discountPercent: discountPercent(cheapest.price, cheapest.compare),
      rating: rating && rating.count > 0 ? rating.sum / rating.count : null,
      reviewCount: rating?.count ?? 0,
      stock: stockFromAvailable(available, stockKnown),
      defaultVariantId: cheapest.id,
      publishedAt: Number.isNaN(published) ? 0 : published,
    });
  }
  return cards;
}

async function loadVariants(db: Db, productId: string): Promise<VariantChoice[]> {
  const [variants, links, inventory] = await Promise.all([
    readRows(
      query(db, "product_variants", "id, sku, price_rial, compare_at_price_rial, is_active")
        .eq("product_id", productId)
        .eq("is_active", true),
    ),
    readRows(query(db, "variant_option_values", "variant_id, option_value_id").limit(2000)),
    readRows(query(db, "inventory_levels", "variant_id, on_hand, reserved").limit(2000)),
  ]);
  if (variants === "missing") return [];
  const stockKnown = inventory !== "missing";
  return variants.map((row) => {
    const id = str(row, "id");
    const available = stockKnown
      ? (inventory)
          .filter((level) => str(level, "variant_id") === id)
          .reduce((sum, level) => sum + ((num(level, "on_hand") ?? 0) - (num(level, "reserved") ?? 0)), 0)
      : null;
    const compare = num(row, "compare_at_price_rial");
    const price = num(row, "price_rial") ?? 0;
    return {
      id,
      sku: str(row, "sku"),
      priceRial: price,
      compareAtPriceRial: compare != null && compare > price ? compare : null,
      optionValueIds:
        links === "missing"
          ? []
          : links.filter((link) => str(link, "variant_id") === id).map((link) => str(link, "option_value_id")),
      available,
    };
  });
}

async function loadOptions(db: Db, productId: string): Promise<OptionGroup[]> {
  const options = await readRows(
    query(db, "product_options", "id, name_fa, position")
      .eq("product_id", productId)
      .order("position", { ascending: true }),
  );
  if (options === "missing" || options.length === 0) return [];
  const values = await readRows(
    query(db, "product_option_values", "id, option_id, value_fa, position").limit(2000),
  );
  if (values === "missing") return [];
  return options.map((option) => ({
    id: str(option, "id"),
    name: str(option, "name_fa"),
    values: values
      .filter((value) => str(value, "option_id") === str(option, "id"))
      .sort((left, right) => (num(left, "position") ?? 0) - (num(right, "position") ?? 0))
      .map((value) => ({ id: str(value, "id"), label: str(value, "value_fa") })),
  }));
}

async function loadSpecs(db: Db, productId: string): Promise<SpecGroup[]> {
  const rows = await readRows(
    query(db, "product_specifications", "group_id, name_fa, value_fa, position")
      .eq("product_id", productId)
      .order("position", { ascending: true }),
  );
  if (rows === "missing" || rows.length === 0) return [];
  const groups = await readRows(query(db, "specification_groups", "id, name_fa, position").limit(200));
  const groupName = new Map(
    (groups === "missing" ? [] : groups).map((group) => [str(group, "id"), str(group, "name_fa")]),
  );
  const grouped = new Map<string, SpecGroup>();
  for (const row of rows) {
    const key = str(row, "group_id") || "general";
    const current = grouped.get(key) ?? { name: groupName.get(key) || "مشخصات", rows: [] };
    current.rows.push({ name: str(row, "name_fa"), value: str(row, "value_fa") });
    grouped.set(key, current);
  }
  return [...grouped.values()];
}

async function loadGallery(db: Db, productId: string, name: string): Promise<MediaAsset[]> {
  const rows = await readRows(
    query(
      db,
      "product_media",
      "kind, cloudinary_public_id, alt_fa, width, height, position",
    )
      .eq("product_id", productId)
      .order("position", { ascending: true }),
  );
  if (rows === "missing") return [];
  return rows.map((row) => mediaFromRow(row, name));
}

async function loadReviews(db: Db, productId: string): Promise<ReviewItem[]> {
  const rows = await readRows(
    query(db, "reviews", "id, rating, body, status")
      .eq("product_id", productId)
      .eq("status", "published")
      .limit(20),
  );
  if (rows === "missing") return [];
  return rows.flatMap((row) => {
    const rating = num(row, "rating");
    if (rating == null) return [];
    return [{ id: str(row, "id"), rating, body: str(row, "body") }];
  });
}

async function loadRelated(db: Db, productId: string): Promise<CatalogCard[]> {
  const rows = await readRows(
    query(db, "product_relations", "related_product_id, relation_type, position")
      .eq("product_id", productId)
      .eq("relation_type", "related")
      .order("position", { ascending: true })
      .limit(8),
  );
  if (rows === "missing" || rows.length === 0) return [];
  const ids = rows.map((row) => str(row, "related_product_id")).filter(Boolean);
  const relatedRows = await readRows(
    query(db, "products", PRODUCT_COLUMNS).eq("status", "published").in("id", ids),
  );
  if (relatedRows === "missing") return [];
  const cards = await hydrate(db, relatedRows);
  return cards.map(stripPublishedAt);
}

function mediaFromRow(row: Record<string, unknown>, fallbackAlt: string): MediaAsset {
  const kind = str(row, "kind") === "video" ? "video" : "image";
  return {
    publicId: str(row, "cloudinary_public_id"),
    alt: str(row, "alt_fa") || fallbackAlt,
    width: num(row, "width"),
    height: num(row, "height"),
    kind,
  };
}

function descendantIds(categories: CategorySummary[], category: CategorySummary): string[] {
  return categories
    .filter((item) => item.path === category.path || item.path.startsWith(`${category.path}.`))
    .map((item) => item.id);
}

function ancestorChain(categories: CategorySummary[], category: CategorySummary): CategorySummary[] {
  const labels = category.path.split(".").filter(Boolean);
  const paths: string[] = [];
  for (const label of labels) {
    const previous = paths[paths.length - 1];
    paths.push(previous ? `${previous}.${label}` : label);
  }
  return paths.flatMap((path) => {
    const match = categories.find((item) => item.path === path);
    return match ? [match] : [];
  });
}
