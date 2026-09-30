# 20. Contributing

Status: architectural baseline. These are the working rules for changes to this repository.

## Purpose

Keep changes incremental, typed, and aligned with the architecture so the codebase stays a modular monolith instead of a pile of helpers.

## Architecture decisions

- Read the relevant doc and ADR before changing a boundary (money, auth, cache, media, state).
- A behavior change updates the doc in the same pull request when the doc would otherwise lie.
- New dependencies need a sentence in the PR: what problem, why this package, what was verified in its current docs. Popularity is not a reason.
- Do not add a service, a global store, or a second pricing path without an ADR.
- Feature code goes in `apps/web/src/features/<feature>`. Shared primitives go in `packages/ui`. Schemas shared by client and server go in `packages/validation`.
- Copy that shoppers see is Persian. Engineering discussion and code identifiers are English. Database status codes are English. Labels are translated at the edge.
- UI work includes loading, error, empty, and success states, RTL layout, and keyboard access for anything a mouse can do.
- Secrets never enter git, screenshots of `.env.local`, or chat transcripts committed into the repo.

## Important concepts

**Incremental.** One phase or one vertical slice per pull request when possible. A pull request that adds a migration, a silent UI, and a refactor of unrelated features is hard to review.

**Public feature API.** Import from `features/<name>`, not from that feature's `data` folder.

**Same schema both sides.** The Zod schema that validates the form is the schema that validates the Server Action.

## Implementation details

### Before you write code

1. Confirm the phase in [22-feature-roadmap.md](22-feature-roadmap.md).
2. Look at the data model in [04-database.md](04-database.md) if you touch rows.
3. If you disagree with an ADR, write a new ADR that supersedes it. Do not quietly route around it.

### Change checklist

- Types are strict. No `any` to silence the database.
- Server Actions validate, authorize, then write.
- Monetary fields are rials in the database and are formatted with `lib/currency`.
- New tables enable RLS in the same migration.
- Client components do not import `server-only` modules.
- Tests from [14-testing.md](14-testing.md) exist for the new rule.
- Docs updated if the contract changed.

### Pull requests

Explain why. Link the roadmap phase. List migrations. Note env var changes. Include a test plan a reviewer can run.

### Generated files

`packages/types/src/database.ts` is generated. Do not hand-edit. Regenerate with `pnpm supabase:types` after migrations.

## Relevant file paths

```text
docs/
docs/adr/
apps/web/src/features/
packages/validation/
supabase/migrations/
```

## Environment variables

If you add a variable, update `.env.example`, [02-development-environment.md](02-development-environment.md), and the deployment doc. Classify it as public or server-only in the PR.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter web build
```

Run the ones your change can affect. CI runs the full required set.

## Security notes

- Report suspected secret leaks by rotating the key first, then removing it from git history with the maintainer. Do not open a public issue that contains the key.
- Do not weaken RLS in a "temporary" migration.
- Fixtures use fake people and `example.com` emails.

## Common mistakes

- A drive-by upgrade of Next.js mixed with a feature, with no note of the version's breaking changes.
- Copying a snippet from an old Supabase tutorial that uses auth-helpers.
- English-only empty states.
- Formatting money with `toLocaleString()` in a component instead of the currency module, which splits Persian digits and the Toman label across the app.
- Adding `packages/utils`.

## Testing strategy

Contributors run the tests for the area they touch. Reviewers look for the missing negative test: the other customer, the expired coupon, the illegal order transition.

## Future extension points

- CODEOWNERS if more than one person maintains admin vs storefront.
- A PR template in `.github/pull_request_template.md` repeating the checklist. Add it when the first real feature PRs start, so the template matches the code layout that exists.
