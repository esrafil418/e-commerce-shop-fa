# 04. Database

Status: architectural baseline. No migrations exist yet. The DDL in this document is the contract Phase 2 will turn into `supabase/migrations`.

## Purpose

Define the PostgreSQL model: tables, money, constraints, indexes, row-level security, and the functions that must be transactional.

## Architecture decisions

- Supabase PostgreSQL is the only application database.
- Primary keys are `uuid` generated with `gen_random_uuid()`, except singleton settings keys and sequences used for human order numbers.
- Money is `bigint` **Iranian rials**. There is no `numeric` money column and no floating point.
- Display currency is Toman (`rial / 10`) in the UI. The database does not store Tomans.
- Timestamps are `timestamptz` stored in UTC.
- Categories use `ltree` (`parent_id` remains for easy edits). Enable the `ltree` and `pg_trgm` extensions in a migration.
- Authoritative cart quote and order placement are SQL functions. TypeScript calls them via RPC.
- RLS is enabled on every table in `public`. Grants are explicit. A table without policies is locked, not public.
- Staff roles live in `public.user_roles`. Policies call `private.has_role(uid, role)`. That function is `security definer`, with `search_path` fixed, and is not executable by `public` except through the policy.
- `user_metadata` is never used for authorization. Customers can edit their own metadata in Supabase Auth.

Recorded in [adr/0002-database.md](adr/0002-database.md).

## Important concepts

**Rial.** The stored unit. `1 Toman = 10 Rial`. A 2,500,000 Toman phone is `25000000` rials.

**Safe integer ceiling.** PostgREST returns `bigint` as a JSON number. Values must stay inside `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991). A check constraint rejects larger amounts. That ceiling is far above any realistic cart. If a future channel exceeds it, change the generated type to string at the client and stop using JS `number`.

**Snapshot.** `order_items` copies sku, name, and unit price at placement. Later catalog edits do not rewrite history.

**Available stock.** `inventory_levels.on_hand - inventory_levels.reserved`. Both columns are `integer` and `>= 0`. `reserved` cannot exceed `on_hand`.

**Reservation.** A row in `inventory_reservations` tied to a cart, with `expires_at`. Checkout creates it. `place_order` consumes it. A scheduled job releases expired rows.

**Quote.** `quote_cart(cart_id, shipping_method_code, coupon_code)` returns line totals and the grand total. `place_order` calls the same internal SQL so the two cannot diverge.

**Closed promotion vocabulary.** Promotions store a `type` the SQL function understands. Unknown types raise. The admin UI offers only known types.

Promotion types for the first commerce release:

| Type | Effect |
| --- | --- |
| `percent_off_variant` | Basis-point discount on selected variants |
| `percent_off_category` | Basis-point discount on products in a category |
| `fixed_off_cart` | Fixed rial discount on merchandise after item promotions |
| `free_shipping` | Shipping amount becomes 0 |

## Implementation details

### Money function

Percent discounts use basis points (100% = 10000). One SQL function rounds half up:

```sql
-- illustrative, not yet a migration
create function rial_percent(amount bigint, bps integer)
returns bigint
language sql
immutable
as $$
  select round(amount * bps / 10000.0)::bigint;
$$;
```

Application of a quote:

1. Line base = `product_variants.price_rial`.
2. Item promotions reduce the line. `compare_at_price_rial` is display-only and is not a discount engine.
3. Coupon applies to the merchandise subtotal after item promotions, then is allocated across lines so line snapshots sum to the merchandise total. Remainder rials go to the last line.
4. Shipping comes from `shipping_methods.price_rial` unless a free-shipping promotion or coupon applies.
5. Tax is `rial_percent(taxable_base, vat_bps)`. Default `vat_bps` is 0 until settings say otherwise. The default taxable base is merchandise after discount. Shipping is not taxed unless a setting says it is.
6. `total = merchandise_after_discount + shipping + tax`.

Coupon order: item promotions, then one coupon, then shipping, then tax. Stacking two coupons is rejected.

### Identity

```text
profiles
  id uuid pk references auth.users(id) on delete cascade
  full_name text
  phone text
  created_at timestamptz
  updated_at timestamptz

user_roles
  user_id uuid references auth.users(id) on delete cascade
  role text check in ('customer','support','catalog_manager','order_manager','admin')
  primary key (user_id, role)

addresses
  id uuid pk
  user_id uuid not null
  label text
  recipient_name text not null
  phone text not null
  province text not null
  city text not null
  line1 text not null
  postal_code text not null
  is_default boolean not null default false
```

A partial unique index keeps a single default address per user.

New users receive a `profiles` row and the `customer` role from a trigger on `auth.users`. Staff roles are inserted by an admin Server Action.

### Catalog

```text
brands (id, name_fa, slug unique, logo_public_id, is_active)
categories (id, parent_id, name_fa, slug unique, path ltree, position, is_active)
products (
  id, brand_id, primary_category_id, name_fa, slug unique,
  description_fa, status check in ('draft','published','archived'),
  published_at, created_at, updated_at
)
product_categories (product_id, category_id) pk
product_options (id, product_id, name_fa, position)
product_option_values (id, option_id, value_fa, position)
product_variants (
  id, product_id, sku unique,
  price_rial bigint check (price_rial >= 0),
  compare_at_price_rial bigint null,
  weight_grams integer,
  is_active boolean
)
variant_option_values (variant_id, option_value_id) pk
attributes (id, code unique, name_fa, is_filterable)
attribute_values (id, attribute_id, value_fa, position)
product_attribute_values (product_id, attribute_value_id)
specification_groups (id, name_fa, position)
product_specifications (id, product_id, group_id, name_fa, value_fa, position)
product_media (
  id, product_id, variant_id null,
  kind check in ('image','video'),
  cloudinary_public_id text not null,
  alt_fa text, width int, height int, position int
)
product_relations (
  product_id, related_product_id,
  relation_type check in ('related','recommended'),
  position,
  primary key (product_id, related_product_id, relation_type)
)
```

Deleting a product is archival (`status = archived`), not a hard delete, once an order item references a variant. Variants referenced by `order_items` cannot be deleted.

### Inventory

```text
warehouses (id, code unique, name_fa)
inventory_levels (
  variant_id, warehouse_id,
  on_hand integer check (on_hand >= 0),
  reserved integer check (reserved >= 0),
  check (reserved <= on_hand),
  primary key (variant_id, warehouse_id)
)
inventory_reservations (
  id, variant_id, warehouse_id, cart_id,
  quantity integer check (quantity > 0),
  status check in ('active','consumed','released'),
  expires_at timestamptz
)
```

Seed inserts one warehouse, code `main`.

### Commerce

```text
carts (
  id, user_id null, guest_token_hash text null,
  status check in ('open','merged','converted'),
  created_at, updated_at,
  check (user_id is not null or guest_token_hash is not null)
)
cart_items (
  id, cart_id, variant_id, quantity integer check (quantity between 1 and 99),
  unique (cart_id, variant_id)
)
coupons (
  id, code unique, discount_type check in ('percent_bps','fixed_rial'),
  discount_value integer, min_subtotal_rial bigint,
  starts_at, ends_at, usage_limit int null, per_user_limit int,
  is_active boolean
)
coupon_redemptions (id, coupon_id, order_id, user_id null, redeemed_at)
promotions (
  id, name_fa, type text, config jsonb not null,
  starts_at, ends_at, is_active
)
shipping_methods (id, code unique, name_fa, price_rial bigint, is_active)
orders (
  id, number text unique,
  user_id null, email text not null,
  status text, -- see order states in docs/12
  subtotal_rial, discount_rial, shipping_rial, tax_rial, total_rial bigint,
  shipping_method_code text,
  address_snapshot jsonb not null,
  idempotency_key text unique,
  placed_at timestamptz
)
order_items (
  id, order_id, variant_id,
  sku_snapshot, name_snapshot,
  quantity int, unit_price_rial, discount_rial, total_rial bigint
)
payments (
  id, order_id, provider text, status text,
  amount_rial bigint, provider_ref text null,
  idempotency_key text unique
)
payment_events (id, payment_id, type text, payload jsonb, created_at)
shipments (id, order_id, status text, tracking_code text null, carrier text null)
return_requests (...)
refunds (...)
idempotency_keys (
  key text primary key,
  user_or_guest text not null,
  request_hash text not null,
  order_id uuid null,
  created_at timestamptz
)
```

`cart_items` does not store price. Guest carts store a hash of a random token. The raw token is an httpOnly cookie.

### Engagement and content

```text
reviews (
  id, product_id, user_id, order_item_id,
  rating integer check (rating between 1 and 5),
  body text, status check in ('published','rejected'),
  unique (product_id, user_id)
)
questions (id, product_id, user_id, body, status)
answers (id, question_id, user_id, body, is_staff boolean)
wishlist_items (user_id, product_id, created_at) pk (user_id, product_id)
notifications (id, user_id, type, title_fa, body_fa, read_at, created_at)
saved_searches (id, user_id, name_fa, query jsonb, created_at)
recently_viewed (user_id, product_id, viewed_at) pk (user_id, product_id)
banners (id, title_fa, href, image_public_id, position, is_active, starts_at, ends_at)
homepage_sections (id, kind, config jsonb, position, is_active)
settings (key text pk, value jsonb)
audit_logs (
  id, actor_id uuid null, action text,
  entity text, entity_id uuid null,
  diff jsonb, created_at timestamptz
)
```

Compare is not a table. `/compare` holds up to four product slugs in the `p` query parameter.

### Indexes

- `products (slug)` unique, `products (status, published_at desc)`
- `categories using gist (path)`
- `product_variants (sku)` unique, `(product_id)`
- `orders (user_id, placed_at desc)`, `orders (idempotency_key)` unique
- `cart_items (cart_id)`
- GIN `pg_trgm` on `products.name_fa` when search work starts
- `inventory_reservations (status, expires_at)` for the expiry job

### RLS sketch

| Table | Customer | Staff |
| --- | --- | --- |
| products, variants, media | `select` where product is `published` | catalog manager or admin: all |
| carts, cart_items | own user id, or guest token hash match via a definer function | no direct access |
| orders | `select` own `user_id` | order manager or admin |
| reviews | `select` published; insert own verified purchase | moderate |
| user_roles | `select` own row | admin writes |
| audit_logs | none | admin `select`; inserts from definer functions |

Guest cart access does not use a policy of `true`. The server client passes the guest token only after reading the httpOnly cookie. A policy can compare `guest_token_hash` to a hash computed in a `security definer` function that reads a request header set by the server, or the Server Action can use the secret client **after** it has loaded the cart by hashed token. Preferred approach: server client calls `get_or_create_guest_cart(token)` as `security definer`, which hashes the token and returns only that cart. The raw token never sits in a table.

### Functions to ship with commerce

| Function | Why SQL |
| --- | --- |
| `quote_cart` | One pricing path |
| `reserve_checkout` | Lock inventory rows, write reservations |
| `place_order` | Quote + order + stock + coupon + idempotency |
| `release_expired_reservations` | Called on a schedule |
| `has_role` | RLS helper |

`place_order` takes an idempotency key. If the key exists with the same request hash, it returns the existing order id. If the key exists with a different hash, it raises.

Inventory updates use `select ... for update` on `inventory_levels`.

### Generated types

```bash
supabase gen types typescript --local --schema public > packages/types/src/database.ts
```

Commit the generated file. Feature code uses `Database["public"]["Tables"]["products"]["Row"]` rather than re-declaring columns. RPC args and returns are generated too; wrap them in small functions in `features/*/data`.

## Relevant file paths

```text
supabase/migrations/
supabase/seed/
supabase/config.toml
packages/types/src/database.ts
apps/web/src/lib/currency/money.ts
apps/web/src/features/*/data/
```

## Environment variables

Local and hosted database access goes through Supabase. Application code uses:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` for jobs that are allowed to bypass RLS

Direct `DATABASE_URL` is for the Supabase CLI and for rare SQL scripts, not for the Next.js runtime.

## Commands

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:migration:new -- name_of_change
pnpm supabase:types
```

`supabase db reset` applies migrations and seed.

## Security notes

- Enable RLS in the same migration that creates the table.
- `security definer` functions set `search_path = public` (and `extensions` if needed) and revoke default execute from `public` / `anon` when the function is privileged.
- Do not grant `anon` insert on `orders`.
- Audit log diffs must omit secrets and full address books when the action does not require them. Order placement may snapshot the shipping address onto the order; the audit row can store the order id instead of a second copy.
- Service-role SQL run from the dashboard is production access. Prefer migrations.

## Common mistakes

- `numeric` or `float` price columns.
- Storing the Toman amount in the database and the rial amount in the UI.
- A second discount implementation in TypeScript.
- Policies that trust `auth.jwt() -> 'user_metadata'`.
- Forgetting a policy and assuming the table is private. In Supabase, table grants to `anon` and `authenticated` plus missing RLS expose rows. RLS on, grants minimal.
- Hard-deleting products that orders reference.
- Using `ltree` path updates without updating descendants when a category moves.

## Testing strategy

- pgTAP or a Vitest integration suite against local Supabase for: RLS (customer cannot read drafts or another user's order), `quote_cart` worked examples, `place_order` idempotency, reservation expiry, and the check that `reserved <= on_hand`.
- A fixture product at `25000000` rials with a 10% category promotion and a fixed coupon is the canonical numeric example. Expected arithmetic is documented in [11-cart-and-checkout.md](11-cart-and-checkout.md) and asserted in the test.
- Currency formatting tests do not need a database.

## Future extension points

- Extra warehouses: `inventory_levels` is already keyed by warehouse. Allocation policy is the later work.
- `invoices` as an immutable document table when a legal invoice must differ from the live order row.
- Full-text search configuration for Persian if `pg_trgm` is not enough. Stay inside Postgres first.
- Partitioning `audit_logs` by month if the table grows.
