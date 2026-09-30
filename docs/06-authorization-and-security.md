# 06. Authorization and security

Status: the application checks below are implemented. RLS for profiles and roles is in the identity migration. Catalog, cart, and order policies arrive with those tables.

## Purpose

Draw the trust boundary and list the controls that keep prices, inventory, roles, and orders server-owned.

## What is implemented

Permissions are a fixed map from role to permission in `apps/web/src/features/auth/permissions.ts`. `admin` receives every permission in `permissionsForRoles` only. Call sites use `canManageProducts` and the other helpers, which call `hasPermission` and do not compare role strings.

The same map is repeated in `private.has_permission`. `private.has_role` treats `admin` as every staff role, so policies do not repeat `or is admin`. `roles.manage` is the exception that asks for the `admin` role itself.

`user_roles` has no insert or delete policy. A trigger rejects writes unless the transaction set `app.role_write`. Only `grant_role`, `revoke_role`, and the signup trigger set that flag. `grant_role` checks `roles.manage` for `auth.uid()` before writing, then inserts `audit_logs`. A profile update schema is `.strict()` and the action rejects `role` before it touches the database. The updated row id is the session user id. A different `userId` returns forbidden.

Checkout is not implemented. `decideCheckoutIntent` is the gate later order code must call: it requires a verified email, ignores a client `userId`, and rejects `price`, `total`, `totalRial`, `discount`, and `shippingPrice`.

Rate limiting is an interface in `apps/web/src/lib/rate-limit`. Login, registration, and password recovery call it. When `SUPABASE_SECRET_KEY` and the project URL are set, the adapter is Postgres (`consume_rate_limit`, executable by `service_role` only) and a failed write denies the attempt. Local development without that secret uses an in-memory adapter in the current process. Production without the secret uses a limiter that denies every attempt. No paid rate-limit product is required.

`GET /api/admin/permissions` is the authorization response for clients: 401 when anonymous, 403 when the user is not staff, 200 with the permission list otherwise. Admin pages use the same decisions and `forbidden()` for the 403 page.

Redirect targets pass through `sanitizeRedirectPath`. Values that do not start with a single `/`, or that decode to a protocol or `//`, fall back to `/`.

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

## What is implemented

Permissions are a fixed map in `apps/web/src/features/auth/permissions.ts`. `permissionsForRoles` is the only function that turns roles into permissions, and it is the only place `admin` receives every permission. Call sites use `canManageProducts`, `canManageOrders`, `canModerateReviews`, `canManageInventory`, and `canManageRoles`. They do not compare role strings.

The same map is repeated in `private.has_permission` so a policy can ask for a permission instead of a role. `private.has_role` treats `admin` as every role. `roles.manage` still requires an actual `admin` row.

| Permission | Roles |
| --- | --- |
| `catalog.products.manage` | `catalog_manager`, `admin` |
| `inventory.manage` | `catalog_manager`, `admin` |
| `orders.manage` | `order_manager`, `admin` |
| `orders.read` | `support`, `order_manager`, `admin` |
| `reviews.moderate` | `support`, `admin` |
| `roles.manage` | `admin` |

`customer` has none of these. Ownership of a profile is `id = auth.uid()`, not a permission.

Protected pages: the proxy redirects anonymous `/account` and `/admin` requests to login. The account layout repeats that check. The admin layout calls `forbidden()` for a signed-in user who is not staff, so the response is an authorization failure rather than another redirect. Each admin section calls the permission helper again and `forbidden()` on failure. Hiding a nav link is not the check.

`GET /api/admin/permissions` repeats the check and returns 401 or 403. Server Actions call `requireSessionActor()` and then `decideProfileUpdate` or `decideGrantRole`.

Untrusted input:

- Profile updates reject `role` and a `userId` that is not the session user.
- `parseTrusted` rejects `price`, `total`, `totalRial`, `discount`, and `shippingPrice` before a schema runs.
- `decideCheckoutIntent` requires a verified session, rejects a client `userId`, and accepts only `cartId`. It does not place an order.
- Redirect targets must be a single-slash relative path. `//`, schemes, and encoded `//` are dropped.
- Login, registration, and password recovery are throttled. The limiter is an interface. With a Supabase URL and secret key it calls `consume_rate_limit` and fails closed if that write fails. Local development without the secret key uses an in-memory adapter in this process. `VERCEL_ENV=production` without the secret key denies the attempt. No paid rate-limit service is required.

The secret key is read only from `createSupabaseSecretClient`. Client modules must not mention it.

## Rules that still apply

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
