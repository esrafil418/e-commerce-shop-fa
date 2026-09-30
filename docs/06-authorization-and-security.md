# 06. Authorization and security

Status: architectural baseline. Controls described here are requirements for the implementation phases, not code that already runs.

## Purpose

Draw the trust boundary and list the controls that keep prices, inventory, roles, and orders server-owned.

## Architecture decisions

- The browser is untrusted. Hidden inputs, Zustand, TanStack Query caches, and localStorage are not authority.
- RLS is the database boundary. Server Actions are the application boundary. Both exist. A missed check in one layer should still fail in the other for customer data.
- Roles live in `user_roles`. Policies use `private.has_role`.
- The Supabase secret key and Cloudinary API secret are server-only and never prefixed with `NEXT_PUBLIC_`.
- Order placement, coupon redemption, and inventory changes happen inside SQL transactions.
- Idempotency keys protect `place_order` and payment capture.
- Public catalog reads are cacheable. Anything with a session, cart, or price quote for a person is not stored in a shared public cache.
- Rate limiting is a Postgres-backed counter for sensitive actions until traffic justifies another store. No Redis in the first release.

## Important concepts

**Authorization.** What a known user may do.

**Authentication.** Who they are. See [05-authentication.md](05-authentication.md).

**Defense in depth.** UI hides the button, the Server Action checks the role, RLS checks the role.

**Fail closed.** Unknown promotion types, missing reservations, and unsigned webhooks abort the operation.

**Guest token.** Random secret in an httpOnly cookie. The database stores a hash. Possession of a cart UUID is not enough to read the cart.

## Implementation details

### Role map

| Role | May |
| --- | --- |
| `customer` | Own profile, addresses, cart, wishlist, orders, reviews of purchased products, questions |
| `support` | Read orders and customers, add internal notes later, no catalog price edits |
| `catalog_manager` | Products, variants, categories, brands, media, inventory counts |
| `order_manager` | Order status, shipments, returns, refunds |
| `admin` | All staff abilities, roles, settings, coupons, promotions, audit log reads |

A person may hold more than one role. `admin` implies the others inside `has_role`, so policies do not need an `or is admin` copy on every line. Implement that implication in one function.

### Untrusted inputs

| Input | Server behavior |
| --- | --- |
| `price`, `total`, `discount` | Ignore. Recompute. |
| `quantity` | Validate range, then check available stock in SQL. |
| `role` | Ignore on profile update. Only admin actions write `user_roles`. |
| `couponCode` | Look up the coupon. Revalidate dates, limits, and minimum subtotal inside `quote_cart`. |
| `shippingPrice` | Ignore. Load `shipping_methods`. |
| `productId` on a review | Accept the id, then require a delivered order item for that user and product. |

### Idempotency

Checkout generates one UUID per attempt and keeps it in component state (and sessionStorage so a refresh does not mint a second order). `place_order` stores it. The payment webhook uses the provider event id as its idempotency key.

### Rate limiting

Table `rate_limit_buckets (key, window_start, count)` or an equivalent upsert. Keys:

- `login:{ip}` and `recover:{ip}`
- `coupon:{user or guest}:{window}`
- `place_order:{user or guest}`

Limits are settings, with conservative defaults (for example 10 login attempts per 10 minutes per IP). The limiter fails closed if the write fails. This is not a substitute for Supabase Auth's own limits.

### Webhooks

`app/api/payments/[provider]/route.ts`:

1. Read the raw body.
2. Verify the signature with `PAYMENT_WEBHOOK_SECRET` or the provider's documented scheme.
3. Reject stale timestamps if the provider sends them.
4. Call a SQL function to record the event once.
5. Return 2xx only after the database commit.

The sandbox provider is allowed only when `PAYMENT_PROVIDER=sandbox`. Production must not enable it.

### Upload security

Signed Cloudinary parameters restrict folder, resource type, and max size. The signature expires. The handler that signs requires a catalog manager or admin. See [07-cloudinary.md](07-cloudinary.md).

### Headers and cookies

- Guest cart and Supabase auth cookies: `httpOnly`, `Secure` in production, `SameSite=Lax`.
- No secrets in query strings.
- Admin routes send the same origin. Server Actions are same-origin by Next.js; do not build a CORS-open mutation API for the browser.

### Audit

Staff mutations that change price, stock, roles, order status, coupons, or settings insert `audit_logs` in the same transaction when the mutation is SQL, or immediately after success when it is an Auth admin call. The actor id is the staff user id.

### Validation

Every Server Action and Route Handler parses input with a Zod schema from `packages/validation`. Schemas do not include fields the server must not trust. If a field is display-only, it is omitted from the mutation schema.

### Dependency and supply chain

Commit the lockfile. CI uses `pnpm install --frozen-lockfile`. Dependabot or Renovate can come later; do not add a bot in the documentation phase.

## Relevant file paths

```text
apps/web/src/proxy.ts
apps/web/src/lib/supabase/secret.ts
apps/web/src/features/*/actions/
apps/web/src/app/api/payments/
apps/web/src/app/api/admin/uploads/sign/route.ts
packages/validation/
supabase/migrations/*_rls.sql
supabase/migrations/*_place_order.sql
```

## Environment variables

Server-only secrets:

```bash
SUPABASE_SECRET_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_API_KEY=
PAYMENT_WEBHOOK_SECRET=
```

Public identifiers:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_SITE_URL=
```

## Commands

```bash
pnpm supabase:reset
pnpm --filter web test
pnpm --filter web exec playwright test
```

A local security check once code exists:

```bash
rg -n "SUPABASE_SECRET_KEY|CLOUDINARY_API_SECRET|service_role" apps/web/src
```

Those names may appear in server-only modules. They must not appear in `"use client"` files.

## Security notes

- This document is the checklist for reviews of checkout, admin, and uploads.
- Do not disable RLS to "make the admin screen work". Add a staff policy.
- Error messages to customers are generic ("email or password is wrong"). Detailed errors go to server logs.
- Personal data (address, phone, email) is not written to analytics events.
- Backup exports of production are production data. They do not go into `supabase/seed`.

## Common mistakes

- Hiding an admin link and forgetting the action.
- Accepting `totalRial` from the checkout form "because we already displayed it".
- Logging the full webhook body when it contains payer details, without a redaction story.
- Using the secret client for all Server Actions because RLS is annoying.
- Putting the Cloudinary unsigned upload preset in the browser.
- Trusting `x-user-id` headers.

## Testing strategy

- RLS tests per sensitive table: owner can read, other customer cannot, anonymous cannot, staff can according to the role map.
- `place_order` ignores a tampered total (the function has no total argument).
- Replay of the same idempotency key returns one order. A second key with the same cart after success does not double-charge stock.
- Upload sign route returns 401/403 without a staff session.
- Zod tests for coupon codes, quantities, and redirect paths.

## Future extension points

- Finer permissions (`catalog.publish` vs `catalog.edit`) as rows instead of role enums, if the five roles become too coarse.
- Vercel WAF or bot protection in front of auth routes.
- Two-person approval for refunds above a threshold.
- Encryption of address snapshots at rest is a database-host concern first; revisit only if a compliance requirement appears.
