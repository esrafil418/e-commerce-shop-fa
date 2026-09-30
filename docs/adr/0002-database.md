# 0002. PostgreSQL model, rials, and transactional checkout

- Status: Accepted
- Date: 2026-09-30

## Purpose

Fix how money, inventory, and orders are stored so the UI cannot become the authority.

## Context

The shop displays Tomans and settles in Iranian rials (10 rials = 1 toman). Prices, coupons, tax, shipping, and stock must stay consistent under concurrent checkouts. Supabase exposes `bigint` as JSON numbers, which are only safe inside the JS safe integer range.

## Decision

- Store money as `bigint` rials with a check constraint inside the JS safe integer range.
- Format Tomans only in `lib/currency`.
- Keep carts as variant id plus quantity.
- Implement `quote_cart` and `place_order` as PostgreSQL functions. The TypeScript server calls them. It does not contain a second discount engine.
- Snapshot sku, name, and amounts onto `order_items`.
- Represent categories with `parent_id` and `ltree`.
- Enable RLS on every application table. Roles live in `user_roles`, not in `user_metadata`.
- Reserve inventory at checkout for a short TTL, not when a line is added to the cart.
- Identify orders with an idempotency key.

The table list and the worked numeric example live in [../04-database.md](../04-database.md) and [../11-cart-and-checkout.md](../11-cart-and-checkout.md).

## Consequences

- Quote bugs are fixed once, in SQL, and covered by integration tests that need a database.
- Application code stays simpler and is the wrong layer for "just a small discount".
- `bigint` JSON numbers are accepted only because of the range check. Exceeding that range is a schema change, not a silent cast.
- Staff must enter Latin slugs. Persian remains the display language.

## Alternatives considered

- **`numeric` or integer Tomans.** Integer Tomans would match the UI and still be exact, but payment providers and the official currency are rial-oriented. One stored unit avoids a second conversion in the gateway. Display conversion is a single division by 10.
- **Floats.** Rejected. They cannot represent money.
- **Pricing only in TypeScript.** Rejected. The transaction that decrements stock would trust a number computed in another process, and two implementations would drift.
- **JSONB cart document.** Rejected. Constraints, RLS, and joins to variants are worse.
- **Reserve on add-to-cart.** Rejected. Abandoned carts would hold stock without a reliable expiry culture in the UI.

## Implementation details

`rial_percent(amount, bps)` rounds half up in SQL. Coupon allocation remainder goes to the last line. Tax defaults to 0 basis points. Shipping prices come from `shipping_methods`.

`place_order` locks inventory, re-quotes, writes the order, consumes reservations, and redeems the coupon in one transaction.

## Relevant file paths

```text
supabase/migrations/
packages/types/src/database.ts
apps/web/src/lib/currency/
```

## Environment variables

Application code uses the Supabase URL and keys. `DATABASE_URL` is for the CLI, not for a `pg` pool inside Next.js in this architecture.

## Commands

```bash
pnpm supabase:reset
pnpm supabase:types
```

## Security notes

Definer functions set `search_path` and are not granted broadly to `anon`. Guest cart functions must prove the token hash. Order placement does not take a client total.

## Common mistakes

- Storing both rial and toman columns "for convenience" and updating only one.
- Reading `compare_at_price_rial` inside the quote.
- Disabling RLS on `orders` during development and forgetting the policy.

## Testing strategy

Integration tests for the fixture quote, idempotency, reservation expiry, and cross-user RLS. Currency formatting is a unit test. Both are required before checkout is called done.

## Future extension points

Another currency means a new ADR. More warehouses can use the existing `inventory_levels` key. Invoice documents can be a new table fed by the snapshot, not a rewrite of `orders`.
