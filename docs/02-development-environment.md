# 02. Development environment

Status: architectural baseline. The tools below are the intended setup. They are not installed in this repository yet.

## Purpose

Describe how a developer runs the storefront locally, which tools are required, and which environment variables exist.

## Architecture decisions

- **pnpm workspaces** manage `apps/*` and `packages/*`. One lockfile at the repo root.
- **Node.js 22 LTS** is the runtime for local development and CI. Use the current 22.x when scaffolding and record it in `package.json` `engines` and in `.nvmrc`.
- **Supabase CLI** runs Postgres, Auth, and Studio locally. Day-to-day development does not use the hosted project.
- **Env files:** `apps/web/.env.example` is committed with empty values. `apps/web/.env.local` is gitignored. Never commit secrets.
- **OS.** The repo is developed on Windows as well as other systems. Scripts use pnpm, not bash-only syntax, except where the Supabase CLI already abstracts it.

## Important concepts

**Workspace root.** `package.json` and `pnpm-workspace.yaml`. Filtering with `pnpm --filter web`.

**Web app root.** `apps/web`. Next.js reads env from this directory.

**Local Supabase.** Docker containers started by `supabase start`. The CLI prints the local URL and keys. Copy them into `.env.local`.

**Publishable key vs secret key.** The publishable key is safe in the browser and still subject to RLS. The secret key bypasses RLS. Supabase's older docs call these the anon key and the service-role key. New projects show a publishable key and a secret key. Use the new names in env files. If a dashboard still shows legacy JWTs, put the anon value in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the service-role value in `SUPABASE_SECRET_KEY`.

## Implementation details

### Prerequisites

- Node.js 22 LTS
- pnpm 10 (or the current pnpm 10.x at Phase 0; enable via Corepack)
- Docker Desktop, required by the Supabase local stack
- Supabase CLI
- Git
- A Cloudinary account when media work starts (Phase 10). Catalog pages can render with placeholder `public_id`s until then.

### Intended root scripts

| Script | Action |
| --- | --- |
| `pnpm dev` | `pnpm --filter web dev` |
| `pnpm build` | `pnpm --filter web build` |
| `pnpm lint` | lint all packages |
| `pnpm typecheck` | `tsc --noEmit` in web and packages |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm supabase:start` | `supabase start` |
| `pnpm supabase:stop` | `supabase stop` |
| `pnpm supabase:reset` | `supabase db reset` |
| `pnpm supabase:types` | generate `packages/types/src/database.ts` |
| `pnpm format` | Prettier |

### Environment file

`apps/web/.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

SUPABASE_SECRET_KEY=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Local Supabase keys change when the local project is recreated. Hosted keys differ per environment (preview vs production). Vercel preview deployments get preview Supabase credentials, not production.

### Git ignore (create in Phase 0)

```text
node_modules/
.pnpm-store/
.next/
dist/
coverage/
playwright-report/
test-results/
.env
.env.local
.env.*.local
.vercel/
*.tsbuildinfo
```

### Editor

TypeScript strict mode. Format on save with Prettier. ESLint for the Next.js and React hooks rules. Tailwind class sorting is optional; do not add a plugin until the Tailwind 4 setup is confirmed.

Recommended VS Code / Cursor extensions: Tailwind CSS, ESLint, Prettier. None are required to build.

## Relevant file paths

```text
package.json
pnpm-workspace.yaml
.nvmrc
apps/web/package.json
apps/web/.env.example
apps/web/.env.local          # not committed
apps/web/next.config.ts
packages/config/
supabase/config.toml
```

## Environment variables

Listed in the example above. `LOG_LEVEL` and `PAYMENT_WEBHOOK_SECRET` are added with observability and payments, not on day one.

`NEXT_PUBLIC_SITE_URL` has no trailing slash.

## Commands

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install
pnpm supabase:start
pnpm supabase:reset
pnpm dev
```

Phase 0 is what makes these commands real.

## Security notes

- Docker and the Supabase CLI expose local ports (API, database, Studio). Do not forward them to the public internet.
- The local secret key is still a secret relative to committed files. It may live in `.env.local` only.
- Do not paste hosted service-role keys into client code while debugging.
- `.env.example` contains names and empty values, never sample real keys.

## Common mistakes

- Running Next.js against the production database from a laptop.
- Installing dependencies with npm inside one package and pnpm at the root.
- Putting `apps/web` env vars only in the repo root `.env`, where Next.js will not load them.
- Following Next.js 14 tutorials that use `middleware.ts` and `@supabase/auth-helpers-nextjs`. This project uses `@supabase/ssr` and `proxy.ts`.

## Testing strategy

Phase 0 acceptance includes `pnpm lint`, `pnpm typecheck`, and `pnpm test` on a trivial passing test so CI has a green path. Later phases add real tests. A smoke test can assert `.env.example` contains the required keys and does not contain `service_role` JWT samples.

## Future extension points

- Devcontainer, if Docker-on-the-host becomes a repeated setup problem.
- Supabase branching for preview databases, once hosted deploys exist.
- A seed password for a local staff user, documented in the seed README section, loaded only by `supabase db reset`.
