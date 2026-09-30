# 10. Catalog

Status: architectural baseline. Catalog tables and pages are planned in Phases 2, 4, and 5.

## Purpose

Define how products, categories, brands, variants, attributes, and merchandising are modeled and shown to shoppers.

## Architecture decisions

- A product is the sellable concept. A variant is the SKU with a price and stock. The storefront never sells a product that has no active variant.
- The primary category drives breadcrumbs. Extra categories are `product_categories` rows.
- Category trees use `parent_id` plus an `ltree` path kept in sync when a category is created or moved.
- Slugs are Latin, unique, and chosen by staff. Names and descriptions are Persian (`name_fa`, `description_fa`).
- Filterable facets come from `attributes` where `is_filterable` is true. Specifications are display-only groups and are not facets.
- Variant axes (color, size) are `product_options`, not the same table as filter attributes, even when the words match. A color option selects a SKU. A color attribute filters a listing. Staff can fill both.
- Related and recommended products are explicit `product_relations` rows. "Recommended" on the home page can also be a `homepage_sections` configuration. There is no ML ranker.
- Search starts as SQL `ILIKE` plus indexes, then `pg_trgm` on `name_fa`. A separate search engine is out of scope until queries are measurably insufficient.
- Only `published` products appear on the storefront. `draft` and `archived` are admin-only.

## Important concepts

**Listing.** A category or search result: cards, filters, sort, pagination.

**PDP.** Product detail page at `/p/[slug]`.

**Availability.** At least one active variant with `on_hand - reserved > 0`. The card shows unavailable when none qualify. The exact number is optional on the card; the PDP can show "موجود" / "ناموجود" and a low-stock phrase when available is below a setting (default 3) without giving away a warehouse report.

**Compare at price.** `compare_at_price_rial` greater than `price_rial` renders a strike-through. It is not fed into `quote_cart`.

**Merchandising collections.**

| Collection | Rule |
| --- | --- |
| Featured | Homepage section lists product ids |
| Newest | `published_at desc` |
| Discounted | `compare_at_price_rial > price_rial` or an active item promotion |
| Popular | Order-item quantity over a trailing window, with a published-date fallback when counts are tied or zero |

## Implementation details

### Routes

```text
/                       home sections
/c/[slug]               category listing, includes descendants via ltree
/p/[slug]               product
/search                 q + filters
/compare                up to 4 slugs
```

### Listing query

Inputs are the parsed URL params from [08-state-management.md](08-state-management.md). The server:

1. Resolves category path and brand ids.
2. Converts min/max Tomans to rials.
3. Filters `status = published`, active variants, optional attribute values, optional in-stock.
4. Sorts with a whitelist. Unknown sort values become `newest`.
5. Paginates.

Empty state: no products, with a control to clear filters. Error state: `error.tsx`. Loading: skeleton cards.

### PDP

Shows name, brand, gallery, variant picker, formatted price, availability, specifications, description, related products, reviews summary (when reviews exist), and questions.

The variant picker is client state for the selected option combination. The price shown is the selected variant's price from the server payload. Changing a variant does not trust a price embedded in the button's dataset if it could drift; the payload is the list of variants loaded with the page. Add-to-cart sends `variantId` and `quantity` only.

Gallery: keyboard accessible, first image is the default, swipe is optional and must not be the only way to change image. Videos render when `product_media.kind = video`.

### Cards

`features/catalog/ui/ProductCard.tsx` shows image, name, brand, price, compare-at price, and availability. The whole card links to the PDP. The wishlist control is a separate button so it is not nested inside the link.

### SEO

Product pages set title, description, canonical URL, and Open Graph image from the first media public id. JSON-LD `Product` uses the variant price in IRR and availability. See [16-seo.md](16-seo.md).

### Admin implications

Catalog managers create the graph described here. Validation: unique slug, at least one variant before publish, every option combination that is offered has a variant row, image alt text required to publish. Publishing with zero images is allowed only as a deliberate fallback (placeholder) and should warn. Prefer blocking publish until one image exists.

## Relevant file paths

```text
apps/web/src/features/catalog/
apps/web/src/features/categories/
apps/web/src/features/search/
apps/web/src/app/(store)/c/[slug]/page.tsx
apps/web/src/app/(store)/p/[slug]/page.tsx
apps/web/src/app/(store)/search/page.tsx
apps/web/src/app/(store)/compare/page.tsx
packages/validation/src/catalog-params.ts
supabase/migrations/*_catalog.sql
supabase/seed/
```

## Environment variables

`NEXT_PUBLIC_SITE_URL` for canonical links.

`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` for images.

No catalog-specific secrets.

## Commands

```bash
pnpm supabase:reset
pnpm --filter web dev
pnpm --filter web test
```

## Security notes

- Storefront queries must not select draft products. RLS is the backstop if a query forgets `status = published`.
- Description HTML is plain text unless a sanitizer is added. Do not render raw staff HTML by default.
- Compare and search ids/slugs are public. Rate-limit abusive search later if needed; the first control is a maximum `q` length (for example 80) and a maximum page number.

## Common mistakes

- One table for "product" with a JSON blob of variants and no SKU uniqueness.
- Filtering by a specification text field instead of indexed attributes.
- Auto-generating slugs from Persian names and producing duplicates or ugly encodings.
- Showing a variant price from `compare_at` by mistake.
- N+1 media queries per card. Listing queries should join the primary image.

## Testing strategy

- Integration: a draft product is invisible on `/p/[slug]` and in search; a published one is visible.
- Unit: sort whitelist and price-bound conversion.
- Component: product card renders Toman output for a known rial fixture and does not show a raw rial integer to shoppers.
- Playwright: category filter updates the URL; descendant products appear on the parent category; compare accepts four slugs and drops a fifth with a visible message.

## Future extension points

- `pg_trgm` similarity ranking.
- Bundles (several SKUs as one offer) as a new product type, not a hack in the cart.
- Per-variant galleries (the `variant_id` column on `product_media` already allows this).
- Facet counts in the filter sidebar, computed in SQL, cached with the category tag.
