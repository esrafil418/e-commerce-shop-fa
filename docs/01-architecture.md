# 01. Architecture

Status: boundaries below still apply. The running app is the shell only: routes, providers, env validation, and logging. Feature modules and Supabase clients are not written yet.

## Purpose

Define the runtime shape of the platform: processes, trust boundaries, request flows, and the rules for adding code. This is the document to read before opening a feature folder.

## Architecture decisions

1. **Modular monolith.** One Next.js process on Vercel. Feature modules are folders, not network services.
2. **PostgreSQL is the authority** for catalog, identity, inventory, prices, and orders. Supabase Auth issues the session. PostgREST is the data API. SQL functions own transactions that must not be split across requests.
3. **Three Supabase clients, two of them common.**
   - Browser client: publishable key, user session, RLS on. Used in Client Components.
   - Server client: publishable key plus request cookies, RLS on. Used in Server Components, Server Actions, and most Route Handlers.
   - Secret client: secret key, RLS bypassed. `server-only`. Webhooks, maintenance jobs, and auth-admin operations. Every call site documents why RLS is not enough.
4. **Next.js 16 session refresh uses `src/proxy.ts`.** It calls `supabase.auth.getClaims()` and writes the refreshed cookies onto the request and the response. Server Components cannot reliably write cookies.
5. **Server Actions for customer and admin mutations** that are initiated by our UI. **Route Handlers for non-UI callers:** payment webhooks, Cloudinary signatures, health checks.
6. **One pricing implementation, in SQL.** TypeScript validates input and calls `quote_cart`. It does not reimplement discounts.
7. **Packages stay thin.** `ui`, `config`, `validation`, and `types`. A fifth package is added only when a second runtime needs the code.
8. **Single locale `fa`.** No i18n framework until a second locale is required. Copy dictionaries can move later.
9. **Latin URL slugs, Persian visible text.** Slugs are typed by staff. We do not auto-transliterate Persian names into slugs.

Rejected options are recorded in [adr/0001-architecture.md](adr/0001-architecture.md).

## Important concepts

**Application layer.** The server action or route handler: authenticate, validate, authorize, call the database, translate errors, revalidate caches.

**Domain rule.** A rule that must stay true regardless of UI: available stock is `on_hand - reserved`; order totals are the quote; a coupon is consumed once per the coupon's limits. Rules that touch multiple rows live in SQL. Pure formatting lives in TypeScript.

**Data access.** Functions that run Supabase queries. They return typed rows or a typed error. They do not render UI.

**Server-only module.** A file that imports `server-only`, so a client import fails the build.

**Client-only module.** A file with `"use client"`. It may format money and call a Server Action. It may not import the secret client, the Cloudinary secret, or service-role helpers.

**Idempotency key.** A client-generated UUID stored for one checkout attempt. Repeating `place_order` with the same key returns the original order.

## Implementation details

### Data flow

```text
Browser
  → Next.js route
    → feature application function
      → Zod schema from packages/validation
      → authorization check
      → data access (server Supabase client or RPC)
        → PostgreSQL
          → RLS
          → constraints
          → transactional function when the use case needs it
```

### Read a product

1. Request hits `app/(store)/p/[slug]/page.tsx`.
2. The page awaits `params` (Next.js 16 params are async).
3. `features/catalog/queries/get-product.ts` selects the published product, variants, media, and specifications through the server client.
4. RLS hides drafts from shoppers. Staff policies allow drafts in admin queries.
5. The page formats money with `lib/currency` and builds image URLs with `lib/cloudinary/delivery`.
6. The response is cacheable with tags `product:{slug}` and `catalog`. Personalized blocks (wishlist heart for the current user) are separate dynamic holes, not part of the cached product payload.

### Add to cart

1. The product form submits a Server Action with `variantId` and `quantity`.
2. Zod checks the UUID and a quantity range (1–99).
3. The action resolves the cart from the user id or the guest cookie.
4. SQL inserts or updates `cart_items` after checking that the variant is active.
5. The action returns the new line count. It does not accept a price field.
6. `revalidatePath` or a cache-tag update refreshes the cart badge.

### Place an order

1. Checkout UI asks `quote_cart` whenever the address, shipping method, or coupon changes.
2. On submit, the action sends `idempotencyKey`, `addressId` or inline address, `shippingMethodCode`, and optional `couponCode`.
3. `place_order` runs in one transaction: lock reservation rows, reject expired holds, call the same quote logic, insert `orders` and `order_items` with snapshots, decrement stock, redeem the coupon, insert a `pending` payment.
4. The sandbox payment provider may mark the payment paid in development. A live provider redirects or waits for a signed webhook.
5. The webhook handler is a Route Handler. It verifies the provider signature, then records the payment once.

### Admin upload

1. An admin Client Component asks `POST /api/admin/uploads/sign`.
2. The handler checks the staff role, then signs Cloudinary params with the API secret.
3. The browser uploads the file to Cloudinary.
4. A Server Action stores `public_id`, alt text, dimensions, and sort position on `product_media`.

### Feature module shape

Create only the folders the feature uses.

```text
features/orders/
  ui/            # components; client where needed
  actions/       # "use server" entry points
  queries/       # read models
  data/          # supabase calls, server-only
  lib/           # feature-local helpers with no IO
  schemas.ts     # re-exports or feature schemas
  types.ts
  index.ts       # public imports for other features
```

`domain/` is reserved for pure functions that are awkward in SQL (for example Persian snippet formatting). Pricing does not go there.

### App Router groups

| Group | URL | Notes |
| --- | --- | --- |
| `(store)` | `/`, `/c/[slug]`, `/p/[slug]`, `/search`, `/cart`, `/compare` | Public |
| `(auth)` | `/auth/login`, `/auth/register`, `/auth/forgot`, `/auth/update-password` | Guest |
| `(account)` | `/account/**` | Signed-in customer |
| `admin` | `/admin/**` | Staff roles |
| `api` | `/api/**` | Route Handlers |

Route groups do not appear in the URL.

### Error, loading, empty

Every major route segment gets `loading.tsx` (skeleton), `error.tsx`, and an empty state inside the page. Mutations return a typed result `{ ok: true, data } | { ok: false, message, fieldErrors }` that the form can show. sonner is for success and unexpected failures, not for field errors.

## Relevant file paths

```text
apps/web/src/app/
apps/web/src/features/
apps/web/src/lib/supabase/client.ts
apps/web/src/lib/supabase/server.ts
apps/web/src/lib/supabase/secret.ts
apps/web/src/lib/currency/
apps/web/src/lib/cloudinary/
apps/web/src/proxy.ts
packages/ui/
packages/validation/
packages/types/
packages/config/
supabase/migrations/
supabase/seed/
```

`supabase/functions/` is not the default place for business logic. Edge functions are for HTTP endpoints Supabase must host (webhooks that should not hit Next.js). Order placement stays in a SQL function invoked from Next.js.

## Environment variables

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server |
| `SUPABASE_SECRET_KEY` | Secret client only |
| `NEXT_PUBLIC_SITE_URL` | Absolute links, sitemap, OAuth redirects |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Delivery URLs |
| `CLOUDINARY_API_KEY` | Signature route |
| `CLOUDINARY_API_SECRET` | Signature route |

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web typecheck
```

These exist after Phase 0.

## Security notes

- Importing `lib/supabase/secret.ts` from a Client Component must fail the build (`server-only`).
- Service-role bypass is an exception with a comment naming the invariant RLS cannot express.
- Cache keys for public catalog pages must not include session cookies. Personalized UI fetches separately.
- `getSession()` on the server is not proof of identity. Use `getClaims()` in the proxy and `getUser()` or `getClaims()` when a Server Action needs the user.

## Common mistakes

- A TypeScript `PricingService` that drifts from `quote_cart`.
- Passing the cart total from the client into `place_order`.
- Putting staff authorization only in the React layout. RLS and the action must both check.
- Creating `packages/services` full of unrelated functions.
- Using Edge middleware patterns from Next.js 15 docs (`middleware.ts`) on Next.js 16, where the file is `proxy.ts`.

## Testing strategy

- Architecture constraints that can be tested: ESLint `import/no-restricted-paths` so `features/cart` does not import `features/orders/data`, and a unit test that client bundles do not contain `SUPABASE_SECRET_KEY` or `CLOUDINARY_API_SECRET` names in `NEXT_PUBLIC` usage.
- Flow tests arrive with the features (catalog render, cart action, `place_order` integration).
- Review new network services in an ADR before adding them.

## Future extension points

- A read replica or Supabase read pooling if catalog read latency requires it. Writes stay on the primary.
- A worker for email and reservation expiry. First implementation can be `pg_cron` plus a Route Handler protected by a shared secret.
- Extracting admin into another app only if the bundle or the deploy cadence truly splits. It would still call the same database functions.
