# e-commerce-shop-fa

Persian-first e-commerce platform. One Next.js application serves the storefront and the admin dashboard. PostgreSQL on Supabase is the system of record. Cloudinary stores and delivers media.

This repository currently holds the architecture baseline. The application has not been scaffolded yet. Implementation follows [docs/22-feature-roadmap.md](docs/22-feature-roadmap.md).

The storefront is inspired by the functional breadth of large Iranian marketplaces. It does not copy their UI, branding, text, assets, or proprietary implementation. The visible site name is a setting, defaulting to «فروشگاه», until a real brand is chosen.

Engineering documents are in English. Storefront and admin copy is Persian.

## Feature list

Planned scope. Nothing below is implemented yet.

**Customers.** Registration, login, logout, password recovery, email verification, profile, addresses, wishlist, comparison, cart, browsing, search, filtering, sorting, variants, galleries, specifications, inventory availability, discounts, coupons, reviews, ratings, questions and answers, order history, order details, tracking, cancellation, returns and refunds, notifications, saved searches, recently viewed products.

**Catalog.** Nested categories, brands, products, variants, attributes, specifications, images, video where a product has it, related and recommended products, and merchandised collections (featured, newest, popular, discounted).

**Commerce.** Persistent cart, coupons, promotions, server-side price calculation, tax and shipping policies, inventory reservation, checkout, a payment provider interface, orders, invoices as projections of orders, shipment states, cancellation, return requests, refund states.

**Admin.** Dashboard, analytics, catalog CRUD, inventory, orders, customers, review moderation, coupons, promotions, banners, homepage sections, notifications, audit logs, settings, and role-based permissions.

**Engineering.** Pagination, URL state, server-side filtering, indexes, caching, safe optimistic UI, error boundaries, skeletons, accessibility, responsive RTL layout, SEO, sitemap, robots, product structured data, image optimization, rate limiting, authorization, validation, idempotent order placement, observability hooks, tests, and CI.

## Architecture

Modular monolith. Browser requests enter Next.js. Server Components, Server Actions, and Route Handlers call feature modules. Feature modules read and write Supabase. PostgreSQL enforces row-level security, money, inventory, and order placement.

```text
Browser
  → Next.js (App Router, Server Components, Server Actions, Route Handlers)
    → feature module (validation, authorization, typed data access)
      → Supabase client (publishable key + user JWT, or secret key on trusted jobs)
        → PostgreSQL (RLS, constraints, transactional functions)
```

Cloudinary sits beside this flow. The database stores `public_id` and presentation metadata. The browser receives transformed delivery URLs. The API secret never reaches the browser.

Detail: [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/01-architecture.md](docs/01-architecture.md).

## Tech stack

| Area | Choice |
| --- | --- |
| Application | Next.js 16 LTS, App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Lucide, Motion for a few transitions |
| Client data | TanStack Query v5 |
| URL state | nuqs 2 (`NuqsAdapter` from `nuqs/adapters/next/app`) |
| Local UI state | Zustand, only for ephemeral UI |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Dates | `date-fns` for arithmetic, `date-fns-jalali` for Persian calendar display |
| Theme | `next-themes` |
| Toasts | sonner |
| Data | Supabase Auth, PostgreSQL, Row Level Security, `@supabase/ssr` |
| Media | Cloudinary signed uploads and transformed delivery |
| Tests | Vitest, React Testing Library, Playwright |
| Quality | ESLint, Prettier, strict TypeScript, GitHub Actions |
| Deploy | Vercel, Supabase, Cloudinary |

Versions move. When a phase installs a package, install the current stable release in that major line and commit the lockfile. As of 2026-09-30, Next.js 16 LTS is the target line (16.3.6 was the last confirmed release; a 16.3.7 security release was scheduled for the same day). On Next.js 16 the session refresher is `src/proxy.ts`, not `middleware.ts`.

## Local setup

These commands are the intended workflow. They fail until Phase 0 creates the workspace.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:types
pnpm --filter web dev
```

The web app is planned to listen on `http://localhost:3000`.

## Supabase setup

1. Install the Supabase CLI.
2. `supabase init` is done in Phase 0 under `supabase/`.
3. Local stack: `pnpm supabase:start`.
4. Migrations live in `supabase/migrations/`. Seed data lives in `supabase/seed/`.
5. Generate types into `packages/types`.
6. Hosted project: create a Supabase project, link it, and push migrations with `supabase db push`. Do not point local development at production.

Auth uses cookie sessions through `@supabase/ssr`. The browser receives the publishable key only. See [docs/05-authentication.md](docs/05-authentication.md).

## Cloudinary setup

1. Create a Cloudinary product environment.
2. Put the cloud name in `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
3. Put the API key and API secret in server-only variables.
4. Admin uploads request a signature from a Route Handler, then upload directly to Cloudinary.
5. Store `public_id` in PostgreSQL.

See [docs/07-cloudinary.md](docs/07-cloudinary.md).

## Environment variables

Public:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Server-only:

```bash
SUPABASE_SECRET_KEY=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Added when those features exist:

```bash
PAYMENT_WEBHOOK_SECRET=
LOG_LEVEL=info
```

`NEXT_PUBLIC_*` is shipped to the browser. The Supabase secret key and the Cloudinary API secret must never use that prefix. Legacy Supabase projects may still show an anon key and a service-role JWT; map them to the publishable and secret variables above. Do not commit `.env.local`.

## Database migrations

```bash
pnpm supabase:reset          # recreate local DB and run migrations + seed
pnpm supabase:migration:new  # supabase migration new <name>
pnpm supabase:types          # regenerate packages/types
```

Schema design: [docs/04-database.md](docs/04-database.md).

## Seed data

`supabase/seed/` will load one warehouse, shipping methods, a category tree, brands, and published products with variants and media references. Seed is for local and preview environments. Production merchandising goes through admin tools.

## Test commands

```bash
pnpm --filter web test
pnpm --filter web test:watch
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web exec playwright test
```

Strategy: [docs/14-testing.md](docs/14-testing.md).

## Build commands

```bash
pnpm --filter web build
pnpm --filter web start
```

## Deployment

Vercel hosts `apps/web`. Supabase hosts Postgres and Auth. Cloudinary hosts media. Set the same environment variables in each host. Run migrations before promoting a release that depends on them.

See [docs/19-deployment.md](docs/19-deployment.md) and [docs/17-ci-cd.md](docs/17-ci-cd.md).

## Screenshots and demo

No UI exists yet, so there are no screenshots. When the storefront is usable, add images under `docs/screenshots/` and link them here. Until then, the roadmap acceptance criteria are the demo checklist.

## Documentation

| Doc | Topic |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Short map of the system |
| [docs/00-overview.md](docs/00-overview.md) | What this project is |
| [docs/01-architecture.md](docs/01-architecture.md) | Boundaries and request paths |
| [docs/02-development-environment.md](docs/02-development-environment.md) | Tools and local setup |
| [docs/03-project-structure.md](docs/03-project-structure.md) | Directories and feature modules |
| [docs/04-database.md](docs/04-database.md) | Schema, money, RLS, functions |
| [docs/05-authentication.md](docs/05-authentication.md) | Supabase Auth |
| [docs/06-authorization-and-security.md](docs/06-authorization-and-security.md) | Trust boundaries |
| [docs/07-cloudinary.md](docs/07-cloudinary.md) | Media |
| [docs/08-state-management.md](docs/08-state-management.md) | Where state lives |
| [docs/09-data-fetching-and-caching.md](docs/09-data-fetching-and-caching.md) | Reads, cache, mutations |
| [docs/10-catalog.md](docs/10-catalog.md) | Catalog model and browsing |
| [docs/11-cart-and-checkout.md](docs/11-cart-and-checkout.md) | Cart, quote, checkout |
| [docs/12-orders-and-payments.md](docs/12-orders-and-payments.md) | Orders, pay, returns |
| [docs/13-admin-dashboard.md](docs/13-admin-dashboard.md) | Admin |
| [docs/14-testing.md](docs/14-testing.md) | Tests |
| [docs/15-performance.md](docs/15-performance.md) | Performance |
| [docs/16-seo.md](docs/16-seo.md) | SEO and metadata |
| [docs/17-ci-cd.md](docs/17-ci-cd.md) | CI |
| [docs/18-observability.md](docs/18-observability.md) | Logs and errors |
| [docs/19-deployment.md](docs/19-deployment.md) | Environments |
| [docs/20-contributing.md](docs/20-contributing.md) | How to change the system |
| [docs/21-adr.md](docs/21-adr.md) | Decision records |
| [docs/22-feature-roadmap.md](docs/22-feature-roadmap.md) | Implementation phases |

## License

No license is selected yet. Add one before publishing the repository.
