# 22. Feature roadmap

Status: Phase 0 and the storefront shell from Phase 1 are implemented locally. CI has not been run on GitHub. Phase 2 (Supabase) has not started.

## Purpose

Order the work so each phase leaves a runnable slice, with tests and acceptance criteria. Do not implement later phases "while you are in the file".

## Architecture decisions

- Vertical slices beat horizontal layers. A phase that adds a table also adds the RLS policy, the typed query, the UI state, and the test that proves the risky part.
- Dependencies are strict where money or identity is involved. Catalog can be read before auth exists. Checkout cannot exist before quote and inventory functions.
- Each phase's acceptance criteria are the definition of done. A phase is not done because the happy path renders.
- Package versions are installed at the phase that needs them, at the current stable release of the majors named in the README.

## Important concepts

**Dependency.** A previous phase that must already meet its acceptance criteria.

**Files likely involved.** Intentional paths. Create them when the task starts. Do not pre-create the whole tree.

**Tests.** The minimum automation for that phase. See [14-testing.md](14-testing.md).

## Implementation details

The phases are the body of this document.

---

### Phase 0 — Workspace foundation

**Goal.** A pnpm workspace that lints, typechecks, and runs an empty Vitest suite in CI.

**Dependencies.** None.

**Tasks.**

- Add root `package.json`, `pnpm-workspace.yaml`, `.nvmrc` (Node 22), `.gitignore`, `.editorconfig`.
- Create `apps/web` with Next.js 16 App Router, TypeScript strict, Tailwind CSS 4, `src/` directory.
- Add `packages/config` (shared TS, ESLint, Prettier), `packages/ui` (empty entry that exports nothing yet, or the first `cn` helper if shadcn needs it), `packages/validation` (one sample schema), `packages/types` (placeholder until generation).
- ESLint and Prettier. `pnpm lint`, `pnpm typecheck`, `pnpm test` scripts.
- GitHub Actions workflow from [17-ci-cd.md](17-ci-cd.md).
- `apps/web/.env.example` with empty values.
- Initialize `supabase/` with `config.toml` only if the CLI is available; otherwise stop after the app scaffold and do Supabase init in Phase 2.

**Files.** `package.json`, `pnpm-workspace.yaml`, `apps/web/**`, `packages/**`, `.github/workflows/ci.yml`, `.gitignore`.

**Tests.** One Vitest test that asserts `format` is not required yet: a pure function `add(1, 1)` is unnecessary. Test that a Zod schema in `packages/validation` rejects an empty email string instead. That proves the workspace link.

**Done in the foundation pass.** Workspace, Next.js 16 app, ESLint, Prettier, strict TypeScript, Vitest, `.env.example`, gitignore, and the CI workflow file. `packages/validation` rejects an empty email. Supabase was not initialized. CI has not been executed on GitHub.

**Acceptance criteria.**

- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm --filter web build` succeed.
- CI is green on a pull request.
- No secrets in the tree.
- README commands match real scripts.

---

### Phase 1 — RTL shell, theme, and design system

**Goal.** A Persian RTL shell with header, footer, home placeholder, dark mode, and the UI primitives the next phases will reuse.

**Dependencies.** Phase 0.

**Tasks.**

- Root layout: `lang="fa"` `dir="rtl"`, Vazirmatn via `next/font`, `next-themes`, sonner, NuqsAdapter, a QueryClient provider.
- Tailwind CSS 4 theme tokens for background, foreground, border, and focus ring. Logical properties only (`ps`, `pe`, `ms`, `me`, `text-start`).
- shadcn/ui primitives actually needed now: button, input, label, dialog, sheet (cart drawer later), skeleton, sonner binding. Use the CLI's current Tailwind 4 instructions. If the CLI selects Base UI or Radix, wrap it in `packages/ui` and do not import the primitive package from features.
- Header and footer with skip link, main landmark, and a theme toggle.
- `error.tsx`, `global-error.tsx`, `not-found.tsx`, route `loading.tsx` skeletons.
- Reduced-motion CSS. No page-transition library yet.
- Logger stub from [18-observability.md](18-observability.md).

**Files.** `apps/web/src/app/layout.tsx`, `apps/web/src/styles/globals.css`, `apps/web/src/components/`, `packages/ui/`, `apps/web/src/lib/observability/logger.ts`.

**Tests.**

- RTL render test or Playwright smoke: `document.documentElement.lang === "fa"` and `dir === "rtl"`.
- Component test: theme toggle changes the `class` on `html` without throwing.
- Logger redaction unit test.

**Done in the foundation pass.** RTL root layout, Vazirmatn, theme, toaster, NuqsAdapter, QueryClient, header, footer, mobile sheet, homepage skeleton, loading/error/not-found, redacting logger, and the shadcn primitives listed in [03-project-structure.md](03-project-structure.md). Vitest covers the homepage placeholder, the theme toggle, parser-adjacent money formatting, and logger redaction. Playwright is not installed, so there is no browser check for horizontal scroll or dialog focus.

**Acceptance criteria.**

- Mobile and desktop widths show a usable header without horizontal scroll.
- Focus rings are visible in light and dark mode.
- Keyboard can reach the theme toggle and the skip link.
- Dialog primitive traps focus (a small component test or Playwright check).

---

### Phase 2 — Database baseline and generated types

**Goal.** Local Supabase with identity, catalog, and inventory tables, RLS on, seed data, generated types.

**Dependencies.** Phase 0. Phase 1 can proceed in parallel but seed browsing waits for Phase 4.

**Tasks.**

- `supabase init` if needed. Migrations for extensions (`pgcrypto`, `ltree`, `pg_trgm`), profiles trigger, roles, catalog tables, warehouses, inventory levels. Follow [04-database.md](04-database.md). Commerce tables may land in this phase as empty structure or wait until Phase 6. Prefer creating catalog and inventory now and commerce in Phase 6 so the migration review stays readable.
- RLS: published catalog readable by `anon`; drafts denied; profiles readable by owner.
- Seed: categories, brands, products, variants, inventory, one image public id per product if a dev Cloudinary id exists; otherwise a documented placeholder public id.
- `pnpm supabase:types` writes `packages/types/src/database.ts`.
- Currency module: `rialToToman`, `formatMoney`, Persian digits, تومان suffix. No database.

**Files.** `supabase/migrations/`, `supabase/seed/`, `packages/types/src/database.ts`, `apps/web/src/lib/currency/`.

**Tests.**

- Integration: anonymous client cannot select a draft product; it can select a published one.
- Unit: `formatMoney(25000000)` shows the Toman form with Persian grouping and does not print the raw rial integer as the primary text.
- Check constraint test: negative `price_rial` fails.

**Acceptance criteria.**

- `pnpm supabase:reset` ends green.
- Generated types compile.
- Seed products have at least one variant and one inventory row.

---

### Phase 3 — Authentication and profile shell

**Goal.** Register, verify email, login, logout, recover password, and a profile page.

**Dependencies.** Phase 1, Phase 2 profiles migration.

**Tasks.**

- `@supabase/ssr` browser and server clients. `src/proxy.ts` refreshes with `getClaims()`.
- Auth screens and confirm Route Handler. See [05-authentication.md](05-authentication.md).
- Account layout guard. Profile read and update (name, phone) in `profiles`.
- Open-redirect sanitizer for `next`.
- Persian form errors. Loading and success states.

**Files.** `apps/web/src/lib/supabase/`, `apps/web/src/proxy.ts`, `apps/web/src/features/auth/`, `apps/web/src/features/profile/`, `apps/web/src/app/(auth)/`, `apps/web/src/app/(account)/`, `packages/validation/src/auth.ts`.

**Tests.**

- Unit: redirect sanitizer rejects `//evil.example` and `https://evil.example`.
- Zod password and email cases.
- Playwright: login with a seeded confirmed user, logout, visit `/account` logged out and land on login.

**Acceptance criteria.**

- Unconfirmed users are not treated as allowed to start payment (the payment gate can be a helper tested now and used in Phase 7).
- Session survives a refresh (cookie, proxy).
- Password fields are never logged.

---

### Phase 4 — Catalog read path

**Goal.** Home, category, and product pages render seed data in Persian with prices, gallery, variants, and specifications.

**Dependencies.** Phase 1, Phase 2. Auth is optional for this phase.

**Tasks.**

- Queries for published products, category tree via `ltree`, primary image.
- Routes `/`, `/c/[slug]`, `/p/[slug]`.
- Product card, gallery, variant picker, spec table.
- `formatMoney` everywhere a price appears.
- Empty category state. `notFound` for missing or draft slugs.
- Metadata and Product JSON-LD for the PDP ([16-seo.md](16-seo.md)).
- Basic `sitemap.ts` and `robots.ts`.

**Files.** `apps/web/src/features/catalog/`, `apps/web/src/features/categories/`, `apps/web/src/app/(store)/`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts`.

**Tests.**

- Integration or server test: draft slug 404s.
- Unit: JSON-LD price is IRR in rials.
- Component: card shows formatted Toman and an accessible product link.
- Playwright: open a seed product, switch variant, see that variant's price in the HTML.

**Acceptance criteria.**

- A shopper can browse from home to category to product on a phone-width viewport.
- Unavailable products are visibly unavailable.
- No client-side price arithmetic.

---

### Phase 5 — Search, filters, sort, compare

**Goal.** URL-driven listing controls and a compare page.

**Dependencies.** Phase 4.

**Tasks.**

- nuqs parsers shared with the server.
- Filters: brand, price bounds (Toman in the URL, rial in SQL), in-stock, filterable attributes, sort, page.
- `/search`.
- `/compare` with at most four slugs.
- Empty and no-result states. Clear-filters control.
- `pg_trgm` index if `ILIKE` is already indexed and the migration is small; otherwise ship `ILIKE` and add trigram in this phase only if the query is written.

**Files.** `apps/web/src/features/search/`, `apps/web/src/features/compare/`, `packages/validation/src/catalog-params.ts`, category page.

**Tests.**

- Parser unit tests, including bad `sort` and `page`.
- Integration: a product outside the price bound is excluded; a child-category product appears on the parent.
- Playwright: applying a filter updates the query string; reload keeps it; a fifth compare id is refused with a message.

**Acceptance criteria.**

- Back button restores the previous filter state.
- Filter UI is usable with the keyboard in RTL.
- Search page is noindex.

---

### Phase 6 — Cart

**Goal.** Persistent guest and user carts without reserving stock.

**Dependencies.** Phase 3, Phase 4. Guest cart can be built before login merge; merge needs Phase 3.

**Tasks.**

- Cart migrations, guest token hash, RLS or definer function as designed.
- Actions: add, update, remove.
- Header badge and drawer (`useUiStore` only for open state).
- `/cart` page with quote display. If `quote_cart` is not ready, show line unit prices from a read-only SQL view that reads `price_rial` and states that discounts arrive with quote. Prefer implementing `quote_cart` without coupons in this phase (sum of variant prices) and extending it in Phase 7. One function, grown in place, not two calculators.
- Login merge.

**Files.** `apps/web/src/features/cart/`, `supabase/migrations/*_cart.sql`, `apps/web/src/components/ui-store.ts`.

**Tests.**

- Integration: two guest cookies cannot read each other's lines.
- Integration: merge sums quantities and caps at 99.
- Playwright: add from PDP, badge updates, refresh keeps the line.

**Acceptance criteria.**

- Cart row has no price column used as authority.
- Add to cart does not change `reserved`.

---

### Phase 7 — Checkout, pricing, reservations, orders

**Goal.** A shopper can place one idempotent order against the sandbox payment provider.

**Dependencies.** Phase 6.

**Tasks.**

- Full `quote_cart` (promotions can be a no-op until Phase 14, but coupons and shipping and tax bps work).
- `reserve_checkout`, `place_order`, `release_expired_reservations`.
- Checkout UI, address snapshot, guest email.
- Sandbox payment webhook.
- Order confirmation page.
- The numeric fixture in [11-cart-and-checkout.md](11-cart-and-checkout.md) as a test. Promotions may be seeded only for the test until the admin UI exists.

**Files.** `apps/web/src/features/checkout/`, `apps/web/src/features/orders/payments/sandbox.ts`, `apps/web/src/app/api/payments/[provider]/route.ts`, order SQL migrations.

**Tests.**

- Integration: fixture totals; idempotent place; expired reservation fails; webhook replay does not double-pay; stock decremented once.
- Playwright: guest checkout happy path.

**Acceptance criteria.**

- `place_order` has no monetary arguments.
- Repeating the submit button yields one order.
- Production env cannot leave sandbox implicit: `PAYMENT_PROVIDER` is required for the webhook route to accept sandbox events.

---

### Phase 8 — Account: addresses, orders, wishlist, recently viewed

**Goal.** Signed-in shoppers manage addresses, see orders, save a wishlist, and see recently viewed products.

**Dependencies.** Phase 3, Phase 4, Phase 7 for orders. Wishlist and recently viewed need only Phase 3 and 4.

**Tasks.**

- Address CRUD, single default.
- Order list and detail, track form (number + email) for guests.
- Wishlist toggle with an optimistic TanStack Query update and rollback.
- Recently viewed: localStorage for guests, table for users, merge on login.
- Cancel order when the transition allows.

**Files.** `features/addresses/`, `features/orders/ui/`, `features/wishlist/`, account routes.

**Tests.**

- RLS: user cannot read another address or order.
- Track form rejects the right number with the wrong email.
- Wishlist rollback component test when the action fails.
- Cancel restocks in the integration suite.

**Acceptance criteria.**

- Empty states for no addresses, no orders, empty wishlist.
- Guest recently viewed stores slugs only.

---

### Phase 9 — Reviews, ratings, questions

**Goal.** Verified buyers review a product. Shoppers ask questions. Staff answers can wait for the admin phase, but the table and a public list exist.

**Dependencies.** Phase 7 (a delivered or paid order item is the verification token; decide in the migration: `paid` is enough for this project so tests do not need a shipping UI first).

**Tasks.**

- Reviews unique per user and product, rating 1–5, verified order required.
- Public average on the PDP.
- Questions from signed-in users. Answers readable when present.
- Reject path in the database even if the button arrives in Phase 13.

**Files.** `features/reviews/`, PDP sections, migrations.

**Tests.**

- User without a purchase cannot insert (RLS or function).
- Second review from the same user fails.
- Average matches the fixture ratings.

**Acceptance criteria.**

- Review form has validation, loading, error, success.
- Rejected reviews are hidden from the storefront.

---

### Phase 10 — Cloudinary pipeline

**Goal.** Staff-signed uploads and delivery presets on cards and the PDP. Until staff UI exists, a developer-only sign route is acceptable if it already checks a catalog role. The admin form may be a single product media panel if Phase 12 has not landed; otherwise attach the panel to the product editor.

**Dependencies.** Phase 3 (roles), Phase 4 (render). Admin shell from Phase 11 if the upload is only exposed there. The sign route can be built and tested with a seeded catalog manager before the full admin chrome.

**Tasks.**

- Delivery helper and `images.remotePatterns`.
- Sign Route Handler and Server Action that inserts `product_media`.
- Replace seed placeholders with real dev-cloud ids when credentials exist.
- Alt text required for images.

**Files.** `lib/cloudinary/`, `app/api/admin/uploads/sign/route.ts`, media UI.

**Tests.**

- Delivery URL unit tests.
- Folder allow-list rejects traversal.
- 401 and 403 on the sign route.

**Acceptance criteria.**

- API secret is absent from client bundles (a build-output search or an import boundary).
- Product cards request a width-limited transformation.

---

### Phase 11 — Admin shell and RBAC

**Goal.** `/admin` layout, navigation by role, forbidden states, audit log table, staff role management.

**Dependencies.** Phase 3, Phase 2 roles.

**Tasks.**

- Layout and desktop-first RTL nav.
- `has_role` implication for `admin`.
- Pages that exist as empty states for sections not built yet, each with the correct role gate, are optional. Prefer only the dashboard shell plus staff roles plus audit list, and add sections in later phases. Empty nav links to nowhere are not required.
- Seed local admin via `SEED_ADMIN_PASSWORD`.

**Files.** `app/admin/`, `features/admin/`, `features/analytics/` for the first SQL counts if orders exist.

**Tests.**

- Customer receives 403 on `/admin`.
- Catalog manager does not open staff management.
- Audit insert on role grant.

**Acceptance criteria.**

- Keyboard access along the nav.
- No secret client used for ordinary admin selects that RLS can express.

---

### Phase 12 — Admin catalog CRUD

**Goal.** Staff can create and publish a product the storefront shows, including variants, categories, brands, specs, and media.

**Dependencies.** Phase 10, Phase 11, Phase 4.

**Tasks.**

- Product list and editor. Toman inputs converted in the shared schema.
- Category tree editor that updates `ltree` descendants on move.
- Brand CRUD.
- Publish validation.

**Files.** `app/admin/products/`, `app/admin/categories/`, `app/admin/brands/`, catalog actions.

**Tests.**

- Playwright: create, publish, see it on the storefront, confirm a draft is absent.
- Integration: moving a category updates descendant paths.
- Schema test for Toman → rial.

**Acceptance criteria.**

- Cache tags for the slug and category invalidate so the new product appears without a manual cache purge.
- Price shown in admin before save matches what `formatMoney` will show on the PDP.

---

### Phase 13 — Admin orders, customers, inventory

**Goal.** Staff can operate the order queue and correct stock with an audit trail.

**Dependencies.** Phase 7, Phase 11.

**Tasks.**

- Order table (TanStack Table + URL state), detail, ship with tracking code, refund via sandbox.
- Customer read-only view for support.
- Inventory adjustment function.
- Return request queue if Phase 15 models exist; otherwise show return status as read-only until Phase 15. Prefer Phase 15 for the shopper return form and this phase for the staff side if the tables already exist. If they do not, create the tables here and the shopper form in Phase 15.

**Files.** `app/admin/orders/`, `app/admin/inventory/`, `app/admin/customers/`, order transition SQL.

**Tests.**

- Illegal transition fails.
- Adjustment cannot push `on_hand` below `reserved`.
- Support cannot change a price.

**Acceptance criteria.**

- A shipped order shows the tracking code to the owning shopper.
- Each adjustment and status change has an audit row.

---

### Phase 14 — Promotions, coupons, homepage content

**Goal.** Merchandising without a deploy: coupons, the closed promotion types, banners, homepage sections.

**Dependencies.** Phase 7 quote function, Phase 12 for a place to attach banners.

**Tasks.**

- Admin CRUD for coupons and promotions.
- `quote_cart` applies the closed vocabulary and fails on unknown types.
- Homepage sections and banners read on `/`.
- Saved searches: schema plus account UI to store the current nuqs object.

**Files.** `features/promotions/`, `app/admin/coupons/`, `app/admin/homepage/`, home page.

**Tests.**

- The documented 25,000,000 rial fixture, now including the 10% promotion and the fixed coupon.
- Expired coupon does not change the total.
- Unknown promotion type raises.

**Acceptance criteria.**

- Shopper-facing totals change only through `quote_cart`.
- Homepage empty of sections still renders a sane default (newest products).

---

### Phase 15 — Notifications, returns, and tracking polish

**Goal.** In-app notifications for order transitions, shopper return requests, and a clear tracking view.

**Dependencies.** Phase 8, Phase 13.

**Tasks.**

- Insert `notifications` from transition functions or from the action immediately after success. Prefer the SQL transition to insert the row so it cannot be forgotten.
- Account notification list, mark read, empty state.
- Return request form and staff decision.
- Email remains deferred. The notification row is the product.

**Files.** `features/notifications/`, return SQL, account UI, admin returns.

**Tests.**

- Paying an order creates one notification.
- Mark-read optimistic rollback.
- Shopper cannot approve their own return.

**Acceptance criteria.**

- Refund state is visible on the order.
- Duplicate transition calls do not duplicate notifications (unique key on order id + type, or insert only when status actually changes).

---

### Phase 16 — SEO, performance, and observability pass

**Goal.** Public pages meet the SEO document, images are transformed, logs are redacted, health check exists.

**Dependencies.** Phase 4 and Phase 10 at minimum. Best done after Phase 14 so the home page is real.

**Tasks.**

- Review metadata, sitemap, robots, canonicals, noindex on filters.
- Lighthouse pass on home, category, PDP. Record results in the PR.
- Confirm storefront bundle does not include the admin table library.
- `/api/health`.
- Replace stray `console.log` in server actions with the logger.

**Files.** SEO files, `next.config.ts`, `app/api/health/route.ts`, logger call sites.

**Tests.**

- JSON-LD and robots unit tests if not already added in Phase 4.
- Health route test with the database up.
- Redaction test already from Phase 1; extend it if new keys appeared.

**Acceptance criteria.**

- Filter URLs are not the canonical for a category.
- Product HTML contains the price without waiting on client JS.
- Health returns 503 when the query fails.

---

### Phase 17 — Hardening and deployment

**Goal.** A preview and a production deployment as described in [19-deployment.md](19-deployment.md), with branch protection and the Playwright list from the testing doc.

**Dependencies.** Phases 0–16 for a full demo. A smaller demo can deploy after Phase 7 if the README says which phases are live.

**Tasks.**

- Vercel project, Supabase projects, Cloudinary clouds.
- Env vars split by environment.
- `supabase db push` process written into the deployment doc with the chosen region.
- Rate-limit buckets on login, coupon, and place_order if not already present.
- Playwright in CI on the default branch.
- Branch protection: lint, typecheck, unit tests.

**Files.** `.github/workflows/ci.yml`, `docs/19-deployment.md` (region filled in), rate-limit migration.

**Tests.**

- The five Playwright flows in [14-testing.md](14-testing.md).
- Rate limit integration: the N+1th login attempt in a window is rejected.

**Acceptance criteria.**

- Preview and production do not share a database.
- `NEXT_PUBLIC_SITE_URL` is the real origin in production.
- A fresh machine can follow the README from clone to local home page.
- No phase's acceptance criteria were skipped without a note in this document.

---

## Environment variables

Introduced along the phases, collected in [02-development-environment.md](02-development-environment.md). `SEED_ADMIN_PASSWORD` is local-only from Phase 11. `PAYMENT_WEBHOOK_SECRET` from Phase 7. `LOG_LEVEL` from Phase 1 or 16.

## Commands

Each phase uses the commands in its feature doc. The always-on set:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter web build
```

## Security notes

Later phases must not "temporarily" bypass RLS to move faster. If a policy blocks a legitimate staff action, change the policy in the same pull request.

Sandbox payments stay gated by `PAYMENT_PROVIDER`.

## Common mistakes

- Starting at Phase 7 because checkout is the interesting part.
- Building admin against the secret key and retrofitting RLS at the end.
- Marking a phase done with only the success state implemented.
- Adding Meilisearch, Redis, or a live payment gateway in the middle of a phase that did not ask for it.

## Testing strategy

A phase is mergeable when its tests are in CI and its acceptance criteria are checked by those tests or by a short manual note in the PR for items that are purely visual (spacing, dark-mode contrast). Visual items still need one screenshot or a Playwright snapshot of the shell only if the team wants it; the RTL smoke test is the automated floor.

## Future extension points

After Phase 17, new work needs an ADR if it crosses a boundary listed in [21-adr.md](21-adr.md). Candidates, in no order: live payment gateway, Persian full-text search beyond trigram, transactional email, a second locale, multi-warehouse allocation, invoice PDFs.
