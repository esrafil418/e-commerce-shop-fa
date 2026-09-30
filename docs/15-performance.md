# 15. Performance

Status: the storefront follows the budgets below. Public HTML is server-rendered. A tagged Next.js cache is not enabled yet, because catalog reads still go through the cookie-bearing Supabase client and must not be shared across users. `lib/cache/tags.ts` names the tags for a later anonymous catalog client.

## Purpose

Set performance budgets and the techniques that are in scope for this monolith.

## Architecture decisions

- Public catalog HTML is cached with tags (see [09-data-fetching-and-caching.md](09-data-fetching-and-caching.md)).
- Images are transformed by Cloudinary and rendered with `next/image` at the preset width. The browser should not download original uploads in a grid.
- JavaScript on the storefront stays small: Server Components by default, client components at the leaf (gallery, add to cart, filters that use nuqs, drawer).
- Motion is used for the cart drawer and at most a few transitions. It is not imported into every card. Respect `prefers-reduced-motion`.
- Fonts: Vazirmatn through `next/font` (Google font loader or a self-hosted file). One family, weights 400 and 700 unless the design needs 500.
- Database: indexes in [04-database.md](04-database.md) ship with the tables, not after a production incident.
- Pagination is mandatory on listings and admin tables. No unbounded `select *` for products.
- TanStack Query `staleTime` avoids refetch storms. It is not a substitute for SQL indexes.

## Important concepts

**Budget (initial targets, production build, desktop and a 375px mobile viewport).**

| Surface | Target |
| --- | --- |
| Home and category document | LCP image is the hero or the first card, not a late client fetch |
| Product page | Main content from the server render, variant price present in HTML |
| Cart | Quote visible without a second pricing implementation |
| Admin table | First page server-rendered |

Specific millisecond SLOs can be added after the first Lighthouse or Vercel speed-insights run. Inventing a precise p95 before there is traffic is not useful. The first measured baseline gets written back into this document.

**N+1.** A listing that queries media per product in a loop. Use a join or a lateral primary-image query.

## Implementation details

- Route-level `loading.tsx` skeletons reserve roughly the same boxes as the loaded UI to reduce layout shift. The store loading state uses the product-card skeleton.
- Product cards request a width-limited Cloudinary URL (`f_auto`, `w_640`) when a cloud name and public id exist. Without a cloud name the card shows a text placeholder instead of an original upload.
- Listing search applies on submit. Header autocomplete calls `/api/search/suggest` after a short pause and does not write the URL on each keystroke.
- Framer Motion is limited to a short page fade, the cart count, and the product gallery. It checks `prefers-reduced-motion`. Cards are not animated.
- The storefront does not import an admin table library.
- `next/font` with `display: "swap"` so Persian text does not block rendering indefinitely.
- Lucide icons are imported per icon, not as the whole pack (the package already supports path imports; follow its current import style).
- Heavy admin dependencies (TanStack Table) are imported from admin routes only, so the storefront bundle does not include them. Check with the Next.js bundle analyzer when admin exists. Add `@next/bundle-analyzer` only for that investigation, not as a permanent runtime dependency.
- Search `q` is debounced in the client if the input writes the URL on each keystroke. Prefer applying search on submit for the first version to avoid a request per character. Debounce is the extension if live search is added.
- Connection pooling is Supabase's pooler in hosted environments. Serverless functions use the pooled connection string only if the app talks to Postgres directly. The default data path is PostgREST, which pools itself. Do not open `pg` connections from Next.js in the first architecture.

## Relevant file paths

```text
apps/web/src/app/(store)/loading.tsx
apps/web/src/lib/cloudinary/delivery.ts
apps/web/src/styles/globals.css
apps/web/next.config.ts
supabase/migrations/   # indexes beside table creation
```

## Environment variables

None specific. Image hosts are configured in `next.config.ts`, not in env, aside from the Cloudinary cloud name.

## Commands

```bash
pnpm --filter web build
pnpm --filter web start
```

Lighthouse against `next start` is the manual check for home, category, and PDP before calling the storefront phase done. Record the scores in the phase PR, not necessarily in this file every time.

## Security notes

- Caching for speed must follow the public-vs-personal split in the caching document. A fast leak is still a leak.
- Image URLs must not include signed private parameters on public product images.

## Common mistakes

- Client-side fetching the product list after a spinner.
- Importing the entire admin table library in the root layout.
- Animating route changes on every navigation.
- `select *` of descriptions and specifications for a category grid.
- Optimizing with Redis before the listing query has an index.

## Testing strategy

- Integration test that the listing query returns the primary image in one round trip (assert the data-access function's shape, or enable SQL logging locally once).
- Playwright on mobile viewport for the header, filters, and PDP gallery as a smoke test that layout works. This is not a full performance test.
- A unit test that delivery presets include a width and `f_auto`.

## Future extension points

- Partial prerendering / Cache Components on the home page after the pattern is proven on one route.
- Keyset pagination if offset becomes slow.
- Read replica for catalog `select`s.
- Edge caching headers for anonymous HTML, coordinated with tag invalidation so price updates are not stuck.
