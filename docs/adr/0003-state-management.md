# 0003. Where state is allowed to live

- Status: Accepted
- Date: 2026-09-30

## Purpose

Prevent carts, prices, and sessions from being copied into a client store that then disagrees with the server.

## Context

The UI needs shareable filters, a cart drawer, forms, dark mode, and responsive admin tables. The stack direction names nuqs, TanStack Query, Zustand, React Hook Form, and `next-themes`. Using all of them for every concern would hide the source of truth.

## Decision

| State | Home |
| --- | --- |
| Filters, sort, pagination, search text, compare slugs | URL, via nuqs, parsers shared with the server |
| Catalog, stock, prices, carts, orders, wishlist, roles, auth session | Server: PostgreSQL and Supabase cookies |
| Cached server payloads and mutations on the client | TanStack Query |
| Cart drawer open, mobile nav open | Zustand, not persisted |
| Unsubmitted form input | React Hook Form, schemas from `packages/validation` |
| Theme | `next-themes` |
| Toasts | sonner |
| Guest recently viewed slugs, checkout idempotency key | localStorage |

Optimistic UI is allowed for wishlist toggles and notification read state. It is not allowed for checkout totals.

Detail and parameter names: [../08-state-management.md](../08-state-management.md).

## Consequences

- Filter bugs show up as URL bugs, which are easy to test.
- The cart drawer must invalidate a query key instead of editing a local cart model.
- Zustand stays small. A pull request that adds cart lines to it is rejecting this ADR.
- Compare links are shareable and capped at four products.

## Alternatives considered

- **One Zustand store for the whole shop.** Rejected. It duplicates the server and breaks multi-tab and refresh.
- **React Context for the cart.** Rejected for the same reason, with extra renders.
- **localStorage cart.** Rejected. Prices and ownership would be client-side, and merging devices would be guesswork.
- **Filters only in component state.** Rejected. They would not survive refresh or a shared link, and the server render would not know them on first paint.

## Implementation details

Price bounds in the URL are Tomans because that is what the shopper typed. Conversion to rials happens once, in the shared parser used by the Server Component.

The guest cart secret is an httpOnly cookie, never localStorage.

## Relevant file paths

```text
apps/web/src/features/search/params.ts
apps/web/src/components/ui-store.ts
apps/web/src/app/providers.tsx
packages/validation/src/catalog-params.ts
```

## Environment variables

None.

## Commands

```bash
pnpm --filter web test
pnpm --filter web exec playwright test
```

## Security notes

The URL and localStorage are public to scripts on the origin. They are for slugs, filters, and an idempotency uuid. Tokens and personal addresses do not go there.

## Common mistakes

- A persisted Zustand cart "for offline".
- Computing a discount in the query cache so the UI matches a design before the quote returns.
- Two parsers for `sort`, one on the client and one on the server, that accept different values.

## Testing strategy

Parser unit tests and a Playwright filter reload test. A review comment is enough to stop a new Zustand field; a lint rule can ban importing the supabase client inside `ui-store.ts` if it becomes a repeated problem.

## Future extension points

Saved searches persist the same parsed object. Realtime stock updates invalidate TanStack Query. They do not introduce a second store.
