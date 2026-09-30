# 0005. Testing strategy

- Status: Accepted
- Date: 2026-09-30

## Purpose

Choose the test tools and what each one is for, before the suite grows into a pile of snapshots.

## Context

The risky behavior is money, inventory, RLS, and a few browser flows (RTL shell, filter URLs, checkout, admin publish). The UI also needs loading, error, empty, and success states. The directed toolchain is Vitest, React Testing Library, and Playwright.

## Decision

- Vitest for units, component tests, and integration tests that call local Supabase.
- React Testing Library for components, asserting accessible Persian text and roles.
- Playwright for a short end-to-end list, not for every component state.
- SQL functions are tested against a real database. Mocking `quote_cart` is not evidence that the total is correct.
- One integration style for SQL: either pgTAP or Vitest-against-local-Supabase, chosen when the commerce migration is written. Not both for the same function.
- Coverage percentages are not a merge gate. The phase acceptance tests are.
- Cypress, Jest, and Enzyme are not added.

The end-to-end list and the definition of done are in [../14-testing.md](../14-testing.md).

## Consequences

- Contributors need Docker for integration tests.
- CI gets a slower optional job. Unit tests stay fast and required.
- Refactors of markup break tests that depend on roles and names, which is the point. They should not break tests that depend on Tailwind class strings.
- A feature PR without a negative test (forbidden, expired, out of stock, invalid input) is incomplete when that failure mode exists.

## Alternatives considered

- **E2E only.** Rejected. Checkout bugs in rounding would be slow to diagnose and easy to skip.
- **Unit tests only, with the database mocked.** Rejected for RLS and `place_order`. Those bugs live in SQL.
- **pgTAP as the only runner.** Reasonable for SQL, poor for React. If pgTAP is chosen later, it covers SQL only; Vitest still covers TypeScript.
- **Storybook visual tests now.** Rejected until there is a design-review problem. Not a substitute for behavior tests.

## Implementation details

Test files sit next to units (`format.test.ts`) and components (`ProductCard.test.tsx`). Playwright specs live in `apps/web/tests/e2e`. Integration tests live in `apps/web/tests/integration` and no-op with a clear error when Supabase is down, or skip when `SUPABASE` URL is absent. Prefer fail-in-CI (URL is always set) and skip locally only when the env var is missing, so a laptop without Docker can still run unit tests.

## Relevant file paths

```text
apps/web/vitest.config.ts
apps/web/playwright.config.ts
apps/web/tests/e2e/
apps/web/tests/integration/
```

## Environment variables

Local Supabase URL and publishable key for integration tests. `PLAYWRIGHT_BASE_URL` optional, default `http://localhost:3000`. No production secrets.

## Commands

```bash
pnpm --filter web test
pnpm --filter web exec playwright test
```

## Security notes

Fixtures use the local secret key from the environment when they must create users. Hosted service-role keys are not used in tests. Traces must not come from production sessions.

## Common mistakes

- Snapshotting full pages.
- Asserting only English strings.
- Sharing one database row across tests without isolation.
- Disabling RLS in the test database to make fixtures easier, then learning nothing about policies.

## Testing strategy

This ADR is the strategy. Phase 0 adds the runner and one real schema test so CI is not wired to zero tests.

## Future extension points

Payment-provider sandbox contract tests, gated off the default job. Visual regression, only with a new note in [../14-testing.md](../14-testing.md), not necessarily a new ADR unless it adds a hosted service.
