# 03. Project structure

Status: architectural baseline. This tree is the target. Only `docs/`, `README.md`, and `ARCHITECTURE.md` exist today.

## Purpose

Fix the directory layout so features do not collapse into global `components`, `services`, and `utils` folders.

## Architecture decisions

- pnpm workspace with one application.
- Feature folders own business code.
- `src/components` is only the application shell (header, footer, providers), not a dumping ground.
- Shared UI primitives live in `packages/ui` so admin and storefront import buttons from one place.
- Generated database types live in `packages/types`. Hand-written zod schemas live in `packages/validation`.
- SQL migrations live in `supabase/migrations`, not inside TypeScript.

## Important concepts

**Public feature API.** `features/<name>/index.ts` exports what other features may import. Deep imports are an ESLint error once the lint rule exists.

**Colocation.** A component used by one feature stays in that feature. It moves to `packages/ui` only when a second feature needs the same visual primitive.

**Server and client split.** Data-access files start with `import "server-only"`. Interactive files start with `"use client"`. A file should not do both.

## Implementation details

```text
e-commerce-shop-fa/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (store)/
│       │   │   ├── (auth)/
│       │   │   ├── (account)/
│       │   │   ├── admin/
│       │   │   ├── api/
│       │   │   ├── layout.tsx
│       │   │   ├── error.tsx
│       │   │   ├── global-error.tsx
│       │   │   └── not-found.tsx
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── catalog/
│       │   │   ├── categories/
│       │   │   ├── search/
│       │   │   ├── cart/
│       │   │   ├── wishlist/
│       │   │   ├── compare/
│       │   │   ├── checkout/
│       │   │   ├── orders/
│       │   │   ├── reviews/
│       │   │   ├── promotions/
│       │   │   ├── inventory/
│       │   │   ├── profile/
│       │   │   ├── addresses/
│       │   │   ├── notifications/
│       │   │   ├── admin/
│       │   │   └── analytics/
│       │   ├── components/          # shell only
│       │   ├── lib/
│       │   │   ├── supabase/
│       │   │   ├── cloudinary/
│       │   │   ├── currency/
│       │   │   └── observability/
│       │   ├── messages/
│       │   │   └── fa.ts
│       │   ├── styles/
│       │   │   └── globals.css
│       │   └── proxy.ts
│       ├── tests/
│       │   └── e2e/
│       ├── next.config.ts
│       └── package.json
├── packages/
│   ├── ui/
│   ├── config/
│   ├── validation/
│   └── types/
│       └── src/database.ts          # generated
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed/
├── docs/
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── ARCHITECTURE.md
```

### Inside a feature

```text
features/catalog/
  ui/ProductCard.tsx
  ui/ProductGallery.tsx
  queries/get-product.ts
  queries/list-products.ts
  data/products.ts          # server-only queries
  actions/                    # only if this feature mutates
  types.ts
  index.ts
```

Empty feature folders are not created in Phase 0. The first task that needs `features/catalog` creates it. The tree above is the map, not a checklist of empty directories.

### What does not get a folder

| Idea | Where it actually goes |
| --- | --- |
| Format a price | `apps/web/src/lib/currency` |
| Format a Jalali date | `apps/web/src/lib/datetime` |
| Button, dialog, input | `packages/ui` |
| Zod cart schema | `packages/validation` |
| `Database["public"]["Tables"]["products"]` | `packages/types` |
| Order placement transaction | `supabase/migrations/*_place_order.sql` |
| One-off className helper | Next to the component, or a tiny `lib/cn.ts` if `packages/ui` needs it |

`lib/cn.ts` is the `clsx` + `tailwind-merge` helper used by shadcn. It is not a general utilities bucket.

### Import direction

```text
app routes  →  features  →  packages/ui, packages/validation, packages/types
                 │
                 └─→  lib/supabase, lib/currency, lib/cloudinary
```

Features do not import from `app`. `packages/ui` does not import from `apps/web`. `packages/validation` does not import Supabase.

Admin screens live in `app/admin` and compose `features/admin` plus the feature they manage (`features/catalog` queries, `features/orders` actions). Admin-only mutations can live in `features/admin/<area>` when they are not the same use case as the storefront.

## Relevant file paths

The tree in this document.

Feature modules named by the product scope:

`auth`, `catalog`, `categories`, `search`, `cart`, `wishlist`, `compare`, `checkout`, `orders`, `reviews`, `promotions`, `inventory`, `profile`, `addresses`, `notifications`, `admin`, `analytics`.

## Environment variables

None specific to layout. See [02-development-environment.md](02-development-environment.md).

## Commands

```bash
pnpm --filter web lint
pnpm typecheck
```

The restricted-import lint rule is added when the second feature exists, so the rule has something real to protect.

## Security notes

- `lib/supabase/secret.ts` and `lib/cloudinary/sign-upload.ts` are server-only.
- Route Handlers under `app/api/admin` are not protected by hiding the URL. They check the session and role.
- Seed files must not contain production secrets or real customer data.

## Common mistakes

- `src/services/api.ts` that every feature calls.
- `src/components/ProductCard.tsx`, `OrderTable.tsx`, and `LoginForm.tsx` side by side.
- Creating all feature folders on day one with `.gitkeep` files.
- Duplicating shadcn components inside each feature.
- Importing `@/features/orders/data/place-order` from the cart UI.

## Testing strategy

- Colocation: component tests sit next to the component as `ProductCard.test.tsx`, or under `features/<name>/__tests__` if that stays easier to configure. Pick one in Phase 1 and keep it.
- Playwright specs live in `apps/web/tests/e2e` because they cross features.
- A lint test (or ESLint in CI) guards import direction.

## Future extension points

- `apps/worker` only if a long-running job cannot be `pg_cron` or a Vercel-invoked Route Handler.
- `packages/currency` only if a second app must format money.
- Storybook for `packages/ui` only if visual regression becomes a real review problem. It is not part of the initial toolchain.
