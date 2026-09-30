# 17. CI/CD

Status: architectural baseline. Workflow files are created in Phase 0, not in the documentation pass.

## Purpose

Define the checks a change must pass and how code reaches Vercel.

## Architecture decisions

- GitHub is the remote. GitHub Actions runs checks.
- Vercel deploys `apps/web` from the same repository. Preview deployments for pull requests, production from the default branch.
- CI installs with `pnpm install --frozen-lockfile`.
- Required checks on pull requests: lint, typecheck, Vitest. Integration tests run when the job has Docker for Supabase. Playwright runs on the default branch and may also run on pull requests once the suite is small and stable.
- Migrations are not applied by the application boot. A human or a protected deploy step runs `supabase db push` against the target project before or as part of promoting a release that contains new SQL. Document the order in the release PR: migrate first, then ship code that depends on the migration. Backward-compatible migrations (add column, backfill, then use) are preferred so a preview deploy does not require perfect ordering.
- Secrets in GitHub Actions and Vercel are entered in the host UI. They are not committed. CI does not receive production `SUPABASE_SECRET_KEY` unless a job truly deploys schema. Default PR checks use local Supabase or no database.
- No deploy to production from a laptop `vercel --prod` as the normal path.

## Important concepts

**Preview.** A Vercel deployment for a branch, with preview env vars and, ideally, a non-production Supabase project.

**Required check.** A failing check blocks merge once branch protection is on.

**Frozen lockfile.** CI fails if `package.json` changed without the lockfile.

## Implementation details

### Workflow sketch

`.github/workflows/ci.yml`:

1. Checkout.
2. Setup pnpm and Node 22.
3. `pnpm install --frozen-lockfile`.
4. `pnpm lint`.
5. `pnpm typecheck`.
6. `pnpm test`.
7. Optional job: Supabase local start, `pnpm test:integration`.
8. Optional job: build, `pnpm exec playwright test`.

Triggers: pull requests and pushes to the default branch.

### Vercel

- Root directory: `apps/web` if the project is configured that way, or the repo root with a build command of `pnpm --filter web build`. Pick one when the Vercel project is created and write it here.
- Install command uses pnpm.
- Environment variables mirror [02-development-environment.md](02-development-environment.md).
- `NEXT_PUBLIC_*` values are available at build time. Changing them requires a redeploy.

### Database releases

1. Migration merged to the default branch.
2. `supabase db push` to the preview project; smoke the preview URL.
3. `supabase db push` to production.
4. Production deployment.

If step 4 goes out before step 3, the new code must tolerate the old schema. Prefer expand-then-contract migrations.

### Git hooks

Optional husky + lint-staged for Prettier and ESLint on commit. Hooks are a convenience. CI is the enforcement. Do not skip CI because a hook exists. Do not add hooks that require secrets.

## Relevant file paths

```text
.github/workflows/ci.yml
apps/web/package.json
package.json
pnpm-lock.yaml
```

## Environment variables

CI job for unit tests: none.

Integration job: local keys printed by `supabase start` inside the job, not repo secrets.

Vercel production:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_SITE_URL
SUPABASE_SECRET_KEY
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
PAYMENT_PROVIDER
PAYMENT_WEBHOOK_SECRET
```

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter web build
```

Locally these are the same commands CI runs.

## Security notes

- Fork pull requests do not receive secret env vars.
- `pull_request_target` is not used.
- Action versions are pinned to a major tag or a commit. Prefer the current stable action major when the file is written, then let updates be deliberate.
- Production deploy logs must not print env files.

## Common mistakes

- Running `pnpm install` in CI without `--frozen-lockfile`.
- Giving the preview deployment the production secret key.
- Applying a destructive migration automatically on every preview deploy.
- A workflow that only lints the web app and ignores `packages/validation`.
- Storing the Vercel token in the repository.

## Testing strategy

The workflow is the test of CI. After Phase 0, a pull request that breaks `pnpm test` should show a red check. Add a trivial unit test in Phase 0 so the job has something to run.

## Future extension points

- Supabase branching per preview.
- A migration drift check (`supabase db diff`) in CI.
- Release notes from merged PRs.
- Renovate for dependency updates, each update still passing this workflow.
