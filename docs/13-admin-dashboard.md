# 13. Admin dashboard

Status: architectural baseline. Admin UI is a later phase. It uses the same app, database, and roles as the storefront.

## Purpose

Describe the staff product: information architecture, permissions, CRUD expectations, and the quality bar for data tables.

## Architecture decisions

- Admin lives at `/admin` in `apps/web`. It is not a second Next.js app.
- The layout is desktop-first and still RTL (`dir="rtl"`, Persian copy).
- Every page checks an authenticated staff role in the layout and again in each mutation. RLS applies the same roles.
- Tables that are more than a simple list use TanStack Table: sorting, column visibility where it helps, and pagination driven by the URL (nuqs) so a filtered order queue is shareable.
- Forms use React Hook Form and the same Zod schemas as the Server Actions.
- Destructive actions confirm in a dialog. Confirmation is not the security control.
- Staff writes that matter insert `audit_logs`.
- Analytics on the first dashboard are SQL aggregates (orders today, paid total, low stock). No third-party product analytics is required for the admin home.

## Important concepts

**Staff role.** One of `support`, `catalog_manager`, `order_manager`, `admin`. See [06-authorization-and-security.md](06-authorization-and-security.md).

**Low stock.** Variants whose available quantity is greater than 0 and less than or equal to `settings.low_stock_threshold` (default 5), plus a count of variants at 0.

**Moderation.** Reviews can be rejected. Questions can be answered as staff (`answers.is_staff`).

## Implementation details

### Sections

| Path | Role | Purpose |
| --- | --- | --- |
| `/admin` | any staff | Counts, recent orders, low stock |
| `/admin/orders` | order manager | Queue, status transitions, tracking |
| `/admin/orders/[number]` | order manager | Detail, refunds, returns |
| `/admin/products` | catalog manager | List, create, edit, publish |
| `/admin/products/[id]` | catalog manager | Variants, media, specs, attributes |
| `/admin/categories` | catalog manager | Tree |
| `/admin/brands` | catalog manager | CRUD |
| `/admin/inventory` | catalog manager | On-hand adjustments |
| `/admin/customers` | support | Read profile and orders |
| `/admin/reviews` | catalog manager | Moderation |
| `/admin/coupons` | admin | CRUD |
| `/admin/promotions` | admin | CRUD of closed types |
| `/admin/banners` | catalog manager | Homepage banners |
| `/admin/homepage` | catalog manager | Section order and config |
| `/admin/notifications` | admin | Compose an in-app notice later |
| `/admin/audit` | admin | Read audit log |
| `/admin/settings` | admin | VAT bps, reservation TTL, low stock, site name |
| `/admin/staff` | admin | Grant and revoke roles |

Support does not see coupon editing. Catalog managers do not cancel orders. Hide nav items the role cannot use, and still return 403 from the page and the action.

### Table behavior

URL params: `page`, `q`, `status`, `sort`. Empty results show an empty state that names the filter. Loading uses skeleton rows. Errors use the segment error boundary.

Row actions are buttons with text, not icon-only, unless the icon has an accessible name.

### Product editor

Must cover: Persian name, Latin slug, brand, categories, description, status, options, variants (SKU, price rial entered as Toman in the form and converted once in the schema transform on the server), inventory on hand, specifications, attributes, media upload, relations.

The form shows the rial value that will be stored before save, so a Toman typo is visible.

Publish runs the catalog validation rules from [10-catalog.md](10-catalog.md).

### Inventory adjustments

An adjustment posts a delta and a reason. SQL applies the delta with a check that `on_hand` does not drop below `reserved`. The audit row stores the delta and the reason. Staff do not type the absolute stock unless the UI is explicitly "set on hand", which is also a delta from the current locked value inside SQL.

### Dashboard aggregates

Queries are SQL (`count`, `sum`) with indexes on `orders.placed_at` and status. They are dynamic (staff-only) and not tagged onto the public catalog cache.

## Relevant file paths

```text
apps/web/src/app/admin/
apps/web/src/features/admin/
apps/web/src/features/analytics/
packages/ui/        # table, dialog, form primitives
packages/validation/src/admin/
```

## Environment variables

Same Supabase variables as the storefront. Upload signing needs Cloudinary server variables. No admin-specific public key.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web exec playwright test tests/e2e/admin-product.spec.ts
```

Seed creates one local admin user. The password is printed by the seed script from an env var `SEED_ADMIN_PASSWORD` that is local-only, or the seed uses the Auth admin API inside `supabase/seed` with a password documented as a local default that production seed never runs. Production does not run the demo seed.

## Security notes

- Do not ship the seed admin password in the client bundle or the README as a production credential. The README may say "local seed password is set with `SEED_ADMIN_PASSWORD`".
- Role changes write `user_roles` and an audit row. They do not write `user_metadata`.
- CSV export, if added, is an authenticated Route Handler that streams only the columns the role may see.
- Audit log viewer is admin-only and does not allow edits.

## Common mistakes

- A single `is_admin` boolean.
- Admin queries using the secret client to skip RLS "for convenience", which then becomes the only client and leaks into storefront code.
- Entering prices in rials in a form labeled تومان.
- Icon-only table actions without names, which fail keyboard and screen-reader checks.
- Building the dashboard as an LTR theme and flipping it at the end.

## Testing strategy

- Playwright: catalog manager publishes a product; the storefront shows it; a customer role opening `/admin/products` gets forbidden.
- Integration: inventory delta cannot drive `on_hand` below `reserved`.
- Component: price field converts 2500000 Toman input into the stored rial amount in the payload builder (the server repeats the conversion; the test covers the shared schema).

## Future extension points

- Saved admin filters.
- Charts (still from SQL) if the first aggregates are not enough. Add a chart library only when a specific chart is designed.
- Impersonation is out of scope. It is easy to abuse and unnecessary for this project.
- Content pages (about, shipping policy) as a small `pages` table managed here when the storefront needs them.
