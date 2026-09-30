# Architecture

Status: baseline for an empty repository. No application code exists yet. Paths below are the intended layout. The long form is [docs/01-architecture.md](docs/01-architecture.md).

## System

One deployable Next.js 16 application (`apps/web`) is the storefront and the admin dashboard. PostgreSQL on Supabase stores catalog, identity, cart, inventory, and orders. Cloudinary stores binaries and serves transformed images. There is no separate commerce service, search cluster, or API gateway.

```text
┌──────────────┐     ┌──────────────────────────────────────────┐
│   Browser    │     │ apps/web (Next.js)                       │
│   RTL / fa   │────▶│  Server Components  (reads)              │
│              │     │  Server Actions     (customer mutations) │
│              │     │  Route Handlers     (webhooks, signatures)│
└──────────────┘     └───────────────┬──────────────────────────┘
                                     │ feature modules
                                     ▼
                         ┌───────────────────────────┐
                         │ Supabase                  │
                         │  Auth (cookie session)    │
                         │  PostgREST + RLS          │
                         │  SQL functions            │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                                 PostgreSQL

Cloudinary ◀── signed upload (admin browser → Cloudinary)
     │
     └── delivery URL built from public_id stored in PostgreSQL
```

## Why one application

Storefront and admin share validation, database types, pricing rules, and the design system. Splitting them into services would duplicate authorization and money rules. Admin routes live under `/admin` in the same app and call the same server boundary.

Shared packages exist only where two callers need the same code:

| Package | Holds |
| --- | --- |
| `packages/ui` | Visual primitives used by storefront and admin |
| `packages/config` | TypeScript, ESLint, Prettier, Tailwind preset |
| `packages/validation` | Zod schemas used by forms and server actions |
| `packages/types` | Generated `Database` types and small shared aliases |

Business workflows stay in `apps/web/src/features/<feature>/`. They are not moved into packages to look layered.

## Request paths

**Public read (product page).** Server Component loads the product through the server Supabase client. RLS allows `select` on published rows. The page renders Persian RTL HTML. Prices are formatted from integer rials. Image URLs are Cloudinary delivery URLs.

**Customer mutation (add to cart, place order).** A Server Action validates input with Zod, resolves the user or guest cart from cookies, and calls Postgres. The client never sends a price, a discount, or a stock count that the server treats as true.

**Privileged side effect (payment webhook, upload signature).** A Route Handler checks a signature or an admin session, then uses the secret-key Supabase client or the Cloudinary API secret. Those modules import `server-only`.

**Interactive client cache.** TanStack Query calls the same Server Actions or a narrow Route Handler. It caches responses. It is not a second backend.

## Money and orders

Amounts are `bigint` Iranian rials. The UI displays Tomans through one formatter (`1 Toman = 10 Rial`). Quote and order placement both call the same SQL function, so the number the customer sees and the number that is charged are one calculation. `place_order` locks inventory, re-quotes, writes immutable line snapshots, and is idempotent.

## Security boundary

| Trusted | Untrusted |
| --- | --- |
| PostgreSQL constraints, RLS, SQL functions | Browser state, hidden form fields, localStorage |
| Server Actions and Route Handlers | Prices, totals, roles, or quantities sent by the client |
| Supabase secret key on the server | Any `NEXT_PUBLIC_` variable |
| Cloudinary API secret on the server | Upload parameters that have not been signed |

Roles live in `user_roles`, not in user-editable metadata. Admin screens check the role, and RLS checks it again.

## State

| State | Home |
| --- | --- |
| Filters, sort, page, search query, compare ids | URL (`nuqs`) |
| Catalog, cart lines, wishlist, orders, inventory, session | Server (Postgres + Supabase Auth cookies) |
| Client cache of server data, mutations | TanStack Query |
| Drawer open, mobile nav | Zustand |
| Field values before submit | React Hook Form |
| Theme | `next-themes` |

Full rules: [docs/08-state-management.md](docs/08-state-management.md).

## Persian UI

The root document is `<html lang="fa" dir="rtl">`. Layout uses CSS logical properties. Pagination, dialogs, tables, and forms are authored for RTL. Latin URLs stay stable (`/p/[slug]`, `/c/[slug]`). Visible copy is Persian. Digits in prices and counts use `fa-IR` formatting. Timestamps are `timestamptz`; the UI renders them in `Asia/Tehran` with the Jalali calendar.

## What is intentionally absent

Microservices, a second pricing engine in TypeScript, a search cluster, a cache database, unsigned Cloudinary uploads, client-authoritative carts, and a translation framework before a second locale exists.
