# 08. State management

Status: architectural baseline. No stores are implemented yet.

## Purpose

Say where each kind of state lives so price, inventory, and identity do not end up in a client store.

## Architecture decisions

State is split by **who is allowed to be right**.

| Home | Holds | Examples |
| --- | --- | --- |
| URL | Shareable view state | Search query, filters, sort, page, compare ids |
| Server | Authority | Products, prices, stock, carts, orders, wishlist, roles, session |
| TanStack Query | Client cache of server data | Cart badge after a mutation, admin table pages, optimistic wishlist toggle |
| Zustand | Ephemeral global UI | Cart drawer open, mobile navigation open |
| React component state / React Hook Form | In-progress input | Dialog open local to one widget, checkout field values |
| `next-themes` | Color theme | `class` on `<html>` |
| sonner | Transient toasts | Success and unexpected error notices |
| localStorage | Non-sensitive preferences that must survive refresh | Recently viewed product slugs for guests, checkout idempotency key |

Recorded in [adr/0003-state-management.md](adr/0003-state-management.md).

The URL is read on the server from `searchParams` and on the client with nuqs. They must use the same parameter names, defined once in `packages/validation` or `features/search/params.ts`.

## Important concepts

**Authority.** The place that wins an argument. For money and stock, that place is PostgreSQL.

**Cache.** A copy that can be stale. TanStack Query and Next.js caches are caches. They are refreshed from the server.

**Ephemeral UI.** Lost on refresh and that is fine. Drawer open state is ephemeral. Cart lines are not.

**Optimistic update.** Allowed when a failed request can roll back without the user acting on a lie about money. Wishlist hearts and "mark notification read" qualify. Checkout totals do not.

## Implementation details

### URL parameters

Catalog and search:

| Param | Meaning |
| --- | --- |
| `q` | Search string |
| `category` | Category slug, if not already in the path |
| `brand` | Repeated or comma-separated brand slugs |
| `min` / `max` | Price bounds in **Tomans as displayed**, converted to rials on the server before the query |
| `sort` | `newest`, `price_asc`, `price_desc`, `popular` |
| `page` | 1-based page |
| `attr` | Filterable attribute values |
| `inStock` | `1` when the user wants available variants only |

Compare: repeated `p` on `/compare`, at most four product slugs. The page fetches those products on the server. A fifth value is dropped with a visible message.

nuqs setup: wrap the tree in `NuqsAdapter` from `nuqs/adapters/next/app`. Parsers live next to the feature. Invalid values fall back to defaults (`page` minimum 1, unknown `sort` becomes `newest`).

Do not duplicate these filters into Zustand "so the sidebar feels faster". nuqs already updates the URL. The server render is the result.

### Server state

- Session: Supabase cookies.
- Cart lines, quantities, coupon code on the cart: `carts` and `cart_items`.
- Wishlist, addresses, orders, notifications, saved searches, signed-in recently viewed: tables.
- Theme is not server state.

Guest recently viewed ids stay in localStorage under a versioned key `recently-viewed:v1`. The value is an array of product slugs, capped at 12. The client fetches those products through a query. localStorage is not rendered as titles and prices without a fetch.

On login, a Server Action merges guest recently viewed slugs into `recently_viewed` and guest cart lines into the user cart.

### TanStack Query

Provider in the root client providers component.

Use it when the UI is interactive after load:

- Cart drawer contents
- Add to cart / update quantity mutations
- Admin tables that paginate without a full navigation
- Wishlist toggle

Query keys are arrays: `['cart']`, `['product', slug]`, `['admin-orders', filters]`.

Server Actions can be the mutation function. After success, invalidate the query key and rely on Next.js revalidation for the RSC tree.

Defaults: `staleTime` around 30 seconds for admin lists, shorter for the cart. Do not set an hour-long stale time on prices.

Optimistic updates: wishlist and notification read state. On error, roll back and show a sonner error. Cart quantity may update optimistically only if the mutation returns the server line and replaces the cache. If stock is insufficient, show the server message and the unchanged quantity.

### Zustand

One store, `useUiStore`, in `apps/web/src/components/ui-store.ts` (client):

```text
cartDrawerOpen: boolean
mobileNavOpen: boolean
openCartDrawer(): void
closeCartDrawer(): void
```

No `persist` middleware. No user object. No cart lines. No prices.

A second store needs a reason written in the pull request. Compare selection is the URL, not a store.

### Component state

- React Hook Form for login, address, checkout, and admin forms. Zod resolver uses the same schema the Server Action uses.
- A menu's open flag stays in the component unless two distant components must open it. The cart drawer is distant (header button and page button), so it is in Zustand.
- Gallery selected image index is component state.

### What must not happen

- Cart totals computed in the client from a product list and then posted back.
- A Zustand `useCartStore` that is the persistence layer.
- Copying the Supabase user into a global store and reading roles from it.
- Storing the access token anywhere we control besides the SSR cookies.

## Relevant file paths

```text
apps/web/src/app/providers.tsx
apps/web/src/components/ui-store.ts
apps/web/src/features/search/params.ts
apps/web/src/features/cart/ui/
apps/web/src/features/checkout/ui/CheckoutForm.tsx
packages/validation/src/catalog-params.ts
packages/validation/src/cart.ts
```

## Environment variables

None for state libraries. `NEXT_PUBLIC_SITE_URL` is unrelated.

TanStack Query and Zustand do not need keys.

## Commands

```bash
pnpm --filter web test
pnpm --filter web exec playwright test
```

Playwright can assert that changing a filter updates the query string and that reload keeps it.

## Security notes

- Anything in the URL is public. Do not put emails, tokens, or address ids in query parameters. Address selection during checkout can be a query param only if it is an opaque id and the server checks ownership. Prefer form state for the selected address.
- localStorage is readable by any script on the origin. It may hold product slugs and an idempotency UUID. It may not hold the guest cart secret; that cookie is httpOnly.
- XSS would expose the session impact through cookie rules (httpOnly limits token theft) and would still be serious. Avoid `dangerouslySetInnerHTML` for product descriptions unless the HTML is sanitized on write with a reviewed sanitizer. Default is plain text or a very small allowed subset decided in the catalog phase.

## Common mistakes

- Mirroring server cart data into Zustand and forgetting to invalidate it.
- Using React context for the cart "because it is global".
- Price filters sent as rials from a Toman input without conversion, or converted in two different places.
- `page=0` because a client assumed 0-based pages.
- Persisting the Zustand UI store and restoring `cartDrawerOpen: true` on every visit.

## Testing strategy

- Unit tests for nuqs parsers and Toman query bounds → rial conversion.
- Component tests: add-to-cart button calls the action and does not render a client-computed total.
- Playwright: filter URL round-trip, compare URL with a fifth id ignored or rejected, drawer opens from the header.

## Future extension points

- Saved searches store the same param object as JSON, validated by the same Zod schema.
- If a realtime inventory badge is required, a Supabase realtime channel can invalidate the TanStack Query key. It does not become the stock authority.
- Multi-tab cart sync: invalidate `['cart']` on window focus. Sufficient for this scale.
