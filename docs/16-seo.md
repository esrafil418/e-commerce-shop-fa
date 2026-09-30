# 16. SEO

Status: architectural baseline. Metadata is implemented with the storefront pages, not before them.

## Purpose

Define how public pages describe themselves to browsers, link previews, and search engines. Admin and account pages stay out of the index.

## Architecture decisions

- Storefront `html` has `lang="fa"` and `dir="rtl"`.
- Titles and meta descriptions are Persian.
- Canonical URLs use `NEXT_PUBLIC_SITE_URL` and Latin slugs.
- Product pages emit Open Graph tags and `Product` JSON-LD.
- `app/sitemap.ts` lists home, published categories, and published products.
- `app/robots.ts` allows the storefront and disallows `/admin`, `/account`, `/auth`, `/checkout`, and `/api`.
- Faceted URLs: index the bare category URL. Filter combinations (`min`, `max`, `attr`, `sort`, `page`) use `robots` noindex or a canonical pointing at the unfiltered category, so infinite filter URLs are not index targets. Search results (`/search?q=`) are noindex.
- Pagination page 1 canonicalizes without `page`. Later pages can be noindex with a canonical to page 1, which is the simple policy for this catalog size.
- Structured prices use ISO currency `IRR` and the stored rial amount. The visible UI still shows Tomans. JSON-LD must not claim the currency is Toman; Toman is not an ISO 4217 code.

## Important concepts

**Canonical.** The URL we ask indexes to treat as the main one.

**JSON-LD.** A script tag with `@type: Product`, name, image, sku of the default or lowest variant, offers with price and availability.

**OG image.** The first product image via the Cloudinary delivery helper, absolute URL.

## Implementation details

### Metadata map

| Page | Index | Title pattern |
| --- | --- | --- |
| Home | yes | Site name from settings |
| Category | yes, unfiltered | `{name_fa} \| {site}` |
| Product | yes | `{name_fa} \| {site}` |
| Search | no | Search |
| Cart, checkout, account, auth, admin | no | Section name |

`generateMetadata` reads the product or category on the server. Missing products call `notFound()`.

### Sitemap

Query published products and active categories. Use `published_at` or `updated_at` as `lastModified`. Cap work with a straightforward select; if the catalog exceeds what one serverless invocation should hold, switch to sitemap index files. That split is not needed for the seed catalog.

### Social

Open Graph `locale` is `fa_IR`. Twitter/X card is `summary_large_image` when an image exists.

### Performance relationship

Metadata and JSON-LD are rendered on the server so the HTML response contains them without a client render.

## Relevant file paths

```text
apps/web/src/app/layout.tsx
apps/web/src/app/robots.ts
apps/web/src/app/sitemap.ts
apps/web/src/app/(store)/p/[slug]/page.tsx
apps/web/src/app/(store)/c/[slug]/page.tsx
apps/web/src/features/catalog/seo/product-json-ld.tsx
```

## Environment variables

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Production is the real origin, https, no trailing slash. Wrong values produce canonicals pointing at localhost. The production deployment checklist includes this variable.

## Commands

```bash
pnpm --filter web build
```

After the storefront exists, open `/robots.txt`, `/sitemap.xml`, and a product page source to confirm JSON-LD.

## Security notes

- Sitemap queries use the anonymous catalog policy. They must not list drafts.
- Do not put customer data in metadata.
- JSON-LD stringifies server data. Escape `<` in JSON (`<` to `\u003c`) so a product name cannot break out of the script tag. Use Next.js's recommended JSON-LD pattern at implementation time and verify it escapes.

## Common mistakes

- Emitting Toman amounts with `priceCurrency: "IRR"`.
- Indexing every filter URL.
- A canonical with a trailing slash mismatch against `NEXT_PUBLIC_SITE_URL`.
- Forgetting `noindex` on checkout, which can otherwise be linked from an email.
- Persian titles in the document with `lang="en"`.

## Testing strategy

- Unit test: product JSON-LD builder returns `priceCurrency: "IRR"` and the rial unit price for the fixture variant, and availability `InStock` / `OutOfStock` from the available quantity.
- Unit test: robots disallow list contains `/admin` and `/checkout`.
- Playwright or a request test: home response includes `lang="fa"` and `dir="rtl"`.

## Future extension points

- `BreadcrumbList` JSON-LD.
- A default OG image for pages without media, designed for this project, not copied.
- `hreflang` only if a second locale ships.
- Merchant feed export as a Route Handler, separate from HTML SEO.
