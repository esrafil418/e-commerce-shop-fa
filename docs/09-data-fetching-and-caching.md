# 09. Data fetching and caching

Status: the fetch policy below is unchanged. The shell does not load commerce data, so there are no cache tags and no TanStack Query calls yet. Next.js 16.3.7 is installed. Check its cache docs before the first catalog query. If a function name differs, keep the policy and update the call.

## Purpose

Define how data is loaded, which responses may be cached, and how mutations become visible.

## Architecture decisions

- The first paint of a public page is a Server Component query, not a client `useEffect` fetch.
- TanStack Query is for client interactions after the page is interactive, and for admin screens that update in place.
- Public catalog data is cached with tags. Personalized data is dynamic.
- Mutations go through Server Actions (UI) or Route Handlers (webhooks, signing). They update cache tags after a successful write.
- There is no application-level Redis. Next.js cache plus Postgres is enough until a measurement says otherwise.
- Client cache is never the price authority. A cached product card can be slightly stale; checkout calls `quote_cart` against the database.

Next.js 16 documents Cache Components, `use cache`, `updateTag()`, `refresh()`, and a refined `revalidateTag()`. Phase 1 reads the installed docs and wraps tag helpers in `lib/cache/tags.ts` so features do not call five spellings.

## Important concepts

**Tag.** A string such as `product:some-slug` or `catalog`. A mutation invalidates the tags it affects.

**Dynamic render.** A page that reads cookies or headers for personalized content. Account, cart, and checkout are dynamic.

**staleTime.** How long TanStack Query will avoid refetching. It is a performance knob, not a correctness mechanism for stock.

**Request-scoped Supabase client.** Created per request with that request's cookies. Do not cache the client across requests.

## What is implemented

- The homepage is a Server Component. It awaits `searchParams` and calls `readCatalogQuery`. A non-empty `q` renders an empty state that says the catalog is not connected. There is no `useEffect` fetch and no product query.
- Because the page reads `searchParams`, `/` is dynamic. `/_not-found` is static. `GET /api/health` returns `{ ok: true }` and logs `health.ok`. It does not query PostgreSQL.
- TanStack Query is mounted for later client interactions. Defaults in `query-provider.tsx`: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`. A new client is created per server render. The browser keeps one client.
- `loading.tsx` on the store route group renders `LoadingState`. `error.tsx` renders `ErrorState` and a retry button. `not-found.tsx` renders `EmptyState`.
- `lib/cache/tags.ts` does not exist. Do not call `use cache`, `updateTag`, or `revalidateTag` until a catalog loader needs them and the installed Next.js docs are checked.

## Rules that still apply

### When to fetch where

| Need | Mechanism |
| --- | --- |
| Product, category, home merchandising | Server Component, cached, tagged |
| Search results | Server Component. Cache only when the query has no user-specific clause. Vary the cache key by the public search params, not by cookies. |
| Cart drawer | TanStack Query calling a Server Action or a route that returns the current cart |
| Checkout quote | Server Action on each relevant change. `cache: 'no-store'` behavior. Do not `use cache` this. |
| Admin tables | Server Component for the first page, TanStack Query or nuqs-driven navigation for further pages |
| Wishlist heart on a cached product page | Small client child that fetches the boolean for the signed-in user. The product HTML stays shared. |

### Tags

```text
catalog
product:{slug}
category:{slug}
brand:{slug}
home
admin-product:{id}
```

Publishing a product updates `product:{slug}`, its category tags, and `catalog` / `home` if the product is merchandised. A price change uses the same tags. Do not invent a tag per user.

### Revalidation

After a successful admin save or a customer mutation that changes a cached page:

1. Write the database.
2. Call the project's `invalidateCatalog({ slug, categorySlug })` helper.
3. The helper calls the Next.js 16 tag API (`updateTag` or `revalidateTag`, whichever the installed docs prescribe for read-your-writes).

Cart mutations call `revalidatePath` for `/cart` if that page is dynamic anyway. Invalidating `['cart']` in TanStack Query covers the drawer.

### Loading and errors

- Route `loading.tsx` shows skeletons that match the RTL layout, not a single spinner for the whole app.
- `error.tsx` offers a retry (`reset`) and a Persian message.
- Data access functions return `null` for not found where a 404 is correct, and throw or return a typed error for unexpected failures.
- Empty lists render an empty state component with one clear action ("clear filters", "browse categories").

### Supabase fetch cache

The Supabase server client uses `fetch`. Next.js may cache `fetch` calls depending on configuration. Catalog queries that must participate in tag invalidation should set the cache option the Next.js 16 docs require for tagged caching. Authenticated queries pass `cache: 'no-store'` (or the current equivalent) so one user's order history is never reused for another.

If those two mechanisms conflict, prefer explicit `no-store` for any query that uses the user JWT, and reserve tagged cache for the anonymous server client reading published catalog data.

### Pagination

Catalog and admin lists use page and page size. Default page size is 24 for the storefront and 20 for admin. The query requests `pageSize + 1` or uses a count selection to know whether a next page exists. Offsets are acceptable at this size. Keyset pagination is a later optimization if `offset` shows up in traces.

Search params are the page source (nuqs), so the server and the client agree.

## Relevant file paths

```text
apps/web/src/app/(store)/page.tsx
apps/web/src/app/(store)/loading.tsx
apps/web/src/app/(store)/error.tsx
apps/web/src/app/api/health/route.ts
apps/web/src/client/query-provider.tsx
apps/web/src/lib/search-params.ts
```

Add `apps/web/src/lib/cache/tags.ts` with the first cached catalog query. Supabase server client and feature query folders do not exist yet.

## Environment variables

None beyond the Supabase public variables. Cache does not use a separate service URL.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
```

In development, caching is often looser than production. Verify tag invalidation with `pnpm --filter web build && pnpm --filter web start`, not only `dev`.

## Security notes

- Never attach a user id to a public cache tag.
- Do not cache `quote_cart` results in a shared cache. A coupon and a cart are personal, and prices must match the database at submit time anyway.
- Route Handlers that return cart JSON must use the session or guest cookie, not an id from the query string alone.

## Common mistakes

- `useEffect` + `fetch` for the product page.
- Caching an authenticated Supabase call with the default fetch cache and leaking another user's payload.
- Forgetting to invalidate `category:{slug}` when a product moves.
- Optimistic checkout that shows a discounted total the server then rejects, with no path back to the quote.
- Caching `getSession()` across requests in a global variable.

## Testing strategy

- Integration test: update a product price, call the invalidate helper, request the product page, expect the new price. This may be a Playwright test against `next start`.
- Unit test the tag helper's argument list given a product slug and category.
- A test that cart and account loaders pass the no-store option (assert on a thin wrapper so the test does not need to patch Next.js internals).

## Future extension points

- `use cache` on pure catalog loaders once the team has used it on one page and confirmed invalidation.
- ISR-style revalidation times as a backstop (for example 10 minutes) plus tags for immediate updates.
- Supabase realtime invalidation for admin inventory. Optional.
- A CDN cache header on truly public image responses. Images are Cloudinary's job first.
