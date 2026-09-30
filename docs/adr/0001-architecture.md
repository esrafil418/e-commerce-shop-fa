# 0001. Modular monolith on Next.js and Supabase

- Status: Accepted
- Date: 2026-09-30

## Purpose

Choose the system shape before any feature code exists. The repository was empty; this is a new project, not a rewrite.

## Context

The product needs a Persian storefront and an admin dashboard with shared catalog, money, and auth rules. The scope is large enough to demonstrate senior full-stack work. It does not need independent scaling of cart versus catalog on day one. The team direction is Next.js 16, Supabase, PostgreSQL, and Cloudinary.

## Decision

Build one Next.js 16 application (`apps/web`) for the storefront and admin. Organize business code as feature modules. Share only `packages/ui`, `packages/config`, `packages/validation`, and `packages/types`. Use Supabase for Auth and PostgreSQL. Put transactional commerce in SQL functions. Deploy the app to Vercel.

Next.js 16 refreshes auth cookies in `src/proxy.ts` (the rename of `middleware.ts`).

Engineering docs are English. Product UI is Persian, RTL, from the first layout.

## Consequences

- One deploy, one database, one place to change a price rule.
- Admin and storefront share a bundle pipeline. Admin-only libraries must not be imported from the storefront layout.
- A long-running worker is not available. Scheduled work uses `pg_cron` or a protected Route Handler.
- Packages that do not earn their keep should not be added. Empty abstraction layers are a regression.

## Alternatives considered

- **Microservices per feature.** Rejected. They would duplicate auth and money rules and add network failure modes the product does not need.
- **Separate admin app.** Rejected for now. The design system and schemas would be copied or prematurely extracted. Revisit only if deploy cadence or bundle size forces it.
- **Next.js frontend plus a standalone Nest/Express API.** Rejected. Server Actions and Route Handlers are enough of a server. A second server would become a second place to forget authorization.
- **Adapting an existing codebase.** There was nothing in the repository to adapt.

## Implementation details

Request path: browser → Next.js → feature module → Supabase client → PostgreSQL (RLS and functions). Cloudinary is beside this path for bytes only.

Feature folders and import direction are specified in [../03-project-structure.md](../03-project-structure.md) and [../01-architecture.md](../01-architecture.md).

## Relevant file paths

```text
apps/web/
packages/ui/
packages/config/
packages/validation/
packages/types/
supabase/migrations/
```

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=
```

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
```

Available once Phase 0 is implemented.

## Security notes

The secret key is not a normal data-access path. RLS is. The monolith makes it easier to audit server code, and it makes a careless secret-client import more dangerous because the same repo ships to the browser. `server-only` is required on secret modules.

## Common mistakes

- Splitting features into packages that only `apps/web` imports.
- Following Next.js 15 middleware examples on Next.js 16.
- Treating this ADR as permission to put all logic in route files. Routes stay thin; features hold the work.

## Testing strategy

Phase 0 proves the workspace. Later phases prove features. A boundary change (new service, new app) supersedes this ADR.

## Future extension points

A worker or a second app, each with a new ADR, still calling the same SQL functions rather than reimplementing quotes.
