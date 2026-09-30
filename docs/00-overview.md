# 00. Overview

Status: architectural baseline. The application described here is not implemented yet.

## Purpose

This document says what the platform is, who it is for, and which decisions are already fixed. Later documents describe how to build it. The implementation order is [22-feature-roadmap.md](22-feature-roadmap.md).

## Architecture decisions

- The repository was empty on 2026-09-30. This is a new codebase, not an adaptation of an existing app.
- One modular monolith: `apps/web` plus thin shared packages. Supabase is the database and auth provider, not a second application we wrap in unnecessary services.
- The storefront is Persian and RTL from the first layout. Admin is Persian and RTL as well, because operators and customers share one language in this product.
- Engineering docs stay in English. Product copy stays in Persian in message modules, not in scattered JSX strings once a feature has more than a few lines of copy.
- The product has no brand name yet. The default site title is «فروشگاه», stored later as a setting. Do not borrow another marketplace's name, logo, or copy.
- Business-critical numbers are computed on the server and stored in PostgreSQL. The browser renders them.

## Important concepts

**Storefront.** Public and customer-account routes. Mobile layout comes first. Desktop enhances it.

**Admin.** `/admin` routes. Desktop layout comes first. The same auth system and the same database serve both surfaces.

**System of record.** PostgreSQL. If the UI and the database disagree about price, stock, role, or order total, the database is right.

**Feature module.** A folder under `apps/web/src/features` that owns one business area. It may contain UI, server actions, queries, and data access. Other features import its public `index.ts`, not its internals.

**Quote.** The priced cart the customer is about to buy. Produced by SQL. Recomputed at order placement.

**Reservation.** A short hold on inventory during checkout. Adding to cart does not reserve stock.

## Implementation details

The platform has to be large enough to show mid-level and senior full-stack work: real schema, RLS, transactional checkout, admin CRUD, tests, and deployment. It does not need a distributed system to show that.

Phase 0 scaffolds the workspace. Phase 1 makes an RTL shell. Catalog, cart, checkout, and admin follow in that order because each one depends on the previous data model. See the roadmap for acceptance criteria.

Out of scope until a later explicit decision:

- A native mobile app
- Multi-vendor seller accounts
- A second locale and `next-intl`
- A dedicated search engine
- A real Iranian payment gateway (a sandbox provider comes first)
- Multiple warehouses in the UI (the schema still has a warehouse row)

## Relevant file paths

| Path | Role |
| --- | --- |
| [../README.md](../README.md) | Entry point and commands |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | One-page system map |
| [01-architecture.md](01-architecture.md) | Boundaries and flows |
| [03-project-structure.md](03-project-structure.md) | Directories |
| [22-feature-roadmap.md](22-feature-roadmap.md) | Phases |
| [adr/](adr/) | Decision records |

No application paths exist on disk yet.

## Environment variables

None are read today. The full list is in [02-development-environment.md](02-development-environment.md).

## Commands

No project commands exist until Phase 0. After that, the root README is the command index.

## Security notes

Documentation must not include real keys, project URLs with embedded passwords, or production customer data. Examples use empty values and fake ids.

## Common mistakes

- Treating this baseline as implemented code and importing paths that are not created yet.
- Starting checkout before the catalog and money rules exist.
- Copying UI or text from an existing marketplace.
- Adding services (search, Redis, email, payments) before the Postgres design needs them.

## Testing strategy

This document is reviewed when scope changes. It has no automated test. Each roadmap phase names the tests that prove that phase.

## Future extension points

- A public brand name and domain, recorded as a setting and in SEO defaults.
- A second sales channel (for example a partner feed) that calls the same SQL functions rather than a new pricing implementation.
- Seller accounts, which would add a tenant key to catalog and order tables. Do not add that key speculatively.
