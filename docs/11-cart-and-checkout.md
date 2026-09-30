# 11. Cart and checkout

Status: architectural baseline. Implemented in the cart and checkout phases, after catalog and money functions exist.

## Purpose

Define the cart, the quote the shopper sees, inventory holds, and the handoff into an order.

## Architecture decisions

- The cart is a server row (`carts`, `cart_items`). Guest and user carts both live in Postgres.
- Cart items store `variant_id` and `quantity` only.
- The displayed total always comes from `quote_cart`. The client does not add prices.
- Adding to cart does **not** reserve inventory. Reservation starts when the shopper enters checkout (`reserve_checkout`) and lasts 15 minutes by default (`reservation_ttl_seconds` in settings).
- One coupon code per cart.
- Guest checkout is allowed. Email is required. A verified account is not required to place an order. Payment of a registered-but-unverified user is blocked until the email is verified; guests provide an email on the order itself.
- Login merges the guest cart into the open user cart. Quantities for the same variant add together, capped at 99 and at available stock at merge time.
- Shipping is a row in `shipping_methods`. The first methods are flat prices. The checkout UI lists active methods. The selected code is an argument to `quote_cart`, which loads the price.
- Tax is a basis-point setting, default 0. The quote function applies it. The UI does not hardcode VAT.

## Important concepts

**Guest token.** Random value, httpOnly cookie `guest_cart`, database stores a hash.

**Quote.** Lines, discounts, shipping, tax, total, all in rials, plus messages for an invalid coupon.

**Reservation.** Rows that increase `inventory_levels.reserved` until expiry, consumption, or release.

**Idempotency key.** UUID for one submit attempt.

## Implementation details

### Add, update, remove

Server Actions:

- `addToCart({ variantId, quantity })`
- `updateCartItem({ itemId, quantity })`
- `removeCartItem({ itemId })`
- `applyCoupon({ code })` / `removeCoupon()`

Each action resolves the caller's cart and ignores any price field. `applyCoupon` only stores the code on the cart (or a `cart_coupons` column). Validity is decided by `quote_cart`, which returns a reason when the code does not apply: inactive, expired, minimum not met, usage limit, wrong user limit.

### Quote example

Fixture, all integers:

| Piece | Rial | Toman display |
| --- | --- | --- |
| Variant price | 25,000,000 | ۲٬۵۰۰٬۰۰۰ |
| Category promotion 10% (1000 bps) | −2,500,000 | |
| Coupon fixed 1,000,000 rial, minimum met | −1,000,000 | |
| Merchandise after discount | 21,500,000 | |
| Shipping | 450,000 | |
| Tax 0 bps | 0 | |
| Total | 21,950,000 | ۲٬۱۹۵٬۰۰۰ |

`quote_cart` is tested against this fixture. The UI formats the total with `formatMoney`.

### Checkout steps

One page is enough if sections are clear. Logical order in the DOM (RTL will place them correctly):

1. Address (saved address for a user, or a form for a guest).
2. Shipping method.
3. Coupon, if not already applied.
4. Quote summary.
5. Place order.

States: loading quote, invalid address field errors, empty cart redirect to `/cart`, reservation failure ("some items are no longer available"), success redirect to the order page.

`reserve_checkout` runs when checkout opens and when quantities change. If it cannot reserve the full quantity, the quote shows the available quantity and the action asks the shopper to update the cart.

### place_order arguments

```text
idempotencyKey
shippingMethodCode
couponCode | null
addressId | null
guestAddress | null
guestEmail | null
```

No monetary arguments. The SQL function loads the cart, requires active reservations, recomputes the quote, inserts the order and items, consumes reservations (decrement `on_hand`, decrement `reserved`), redeems the coupon, marks the cart `converted`, and inserts a `pending` payment.

Address snapshot is JSON on the order: recipient, phone, province, city, line, postal code. Later edits to `addresses` do not change the order.

### Cart UI

`/cart` lists lines with image, name, variant label, unit price from the quote, quantity control, line total, and the summary. Empty cart has a link to the home or a featured category.

The header badge reads the server line count. The drawer uses TanStack Query. Opening the drawer is Zustand.

Quantity controls are buttons with accessible names in Persian, not only icons.

## Relevant file paths

```text
apps/web/src/features/cart/
apps/web/src/features/checkout/
apps/web/src/app/(store)/cart/page.tsx
apps/web/src/app/(store)/checkout/page.tsx
packages/validation/src/cart.ts
packages/validation/src/checkout.ts
supabase/migrations/*_quote_cart.sql
supabase/migrations/*_place_order.sql
apps/web/src/lib/currency/format.ts
```

## Environment variables

No new public variables.

`PAYMENT_PROVIDER=sandbox` is read by the payment step after the order exists. See [12-orders-and-payments.md](12-orders-and-payments.md).

## Commands

```bash
pnpm supabase:reset
pnpm --filter web test
pnpm --filter web exec playwright test tests/e2e/checkout.spec.ts
```

## Security notes

- Cookie flags for `guest_cart`: httpOnly, SameSite=Lax, Secure in production.
- `quote_cart` and `place_order` run as security definer functions that take a cart id only after the Server Action has authorized that cart. They are not granted to `anon` for arbitrary ids. The action uses the server client RPC only if the function checks the auth uid or the guest hash. Prefer the function to re-check ownership.
- Coupon brute force is rate limited per [06-authorization-and-security.md](06-authorization-and-security.md).
- Do not put the guest token in the URL.

## Common mistakes

- Reserving stock on add-to-cart and exhausting inventory with abandoned carts. Reservation is short and starts at checkout.
- Merging carts on the client.
- Showing a spinner total computed with JavaScript `*` on floats.
- Letting the coupon percent stack in the UI and again in SQL.
- Forgetting to release reservations when the shopper removes a line during checkout.

## Testing strategy

- SQL/integration: the fixture quote; coupon rejected below the minimum; second coupon ignored; idempotent `place_order`; stock not decremented twice; expired reservation cannot place the order.
- Unit: `formatMoney` for `21950000` rials renders the Toman figure with Persian digits and the تومان label.
- Playwright: guest adds a product, sees the server total, submits checkout against the sandbox provider, lands on the order page. A second click does not create a second order.

## Future extension points

- Multi-shipment quotes (still one function, richer return type).
- Saved carts for later (status already allows more than `open`).
- Gift cards as another closed `quote_cart` effect, not a client discount.
- Buy-now that creates a one-line cart and jumps to checkout. It uses the same functions.
