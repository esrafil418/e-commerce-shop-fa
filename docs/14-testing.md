# 14. Testing

Status: architectural baseline. Test runners are installed in Phase 0. Feature tests arrive with the feature, not months later in a single "test phase".

## Purpose

Define the test pyramid, what each layer is responsible for, and the minimum bar for a feature to be called done.

## Architecture decisions

- **Vitest** runs unit and component tests.
- **React Testing Library** renders components the way a user sees them: roles, names, and text. Persian strings are part of the assertion when they are the accessible name.
- **Playwright** covers a short list of cross-page flows against a running app and local Supabase.
- **SQL behavior** (RLS, `quote_cart`, `place_order`) is tested with an integration suite that uses the local database. pgTAP is acceptable if the team prefers tests inside migrations; a Vitest file that calls RPC against local Supabase is also acceptable. Pick one in the commerce phase and do not maintain both for the same function.
- Do not add Cypress, Jest, or a second component library.
- Tests do not hit production, a live payment gateway, or the production Cloudinary cloud.
- Coverage is a signal, not a gate. Critical money and auth paths are the gate. A global 100% target is not.

Recorded in [adr/0005-testing-strategy.md](adr/0005-testing-strategy.md).

## Important concepts

**Unit test.** Pure functions: money format, URL parsers, redirect sanitizer, Zod schemas, delivery URL builder.

**Component test.** RTL renders a client component with mocked actions. Asserts states: loading, error, empty, success.

**Integration test.** Real Postgres, test transactions rolled back or a reset database. Asserts RLS and SQL functions.

**E2E test.** Browser. Few of them. They are slower and are the ones that catch wiring mistakes.

## Implementation details

### Layout

```text
apps/web/src/features/catalog/ui/ProductCard.test.tsx
apps/web/src/lib/currency/format.test.ts
apps/web/tests/integration/quote-cart.test.ts
apps/web/tests/e2e/checkout.spec.ts
apps/web/vitest.config.ts
apps/web/playwright.config.ts
```

Vitest includes `src/**/*.test.ts(x)` and `tests/integration/**/*.test.ts`. Playwright owns `tests/e2e`.

### Definition of done for a feature

- Validation schema tests for the mutation inputs.
- The happy path and one failure path (empty, forbidden, or out of stock) automated at the layer that can see that failure.
- Loading, error, empty, and success states exist in the UI. Component tests cover empty and error when the component owns them; otherwise Playwright or a page-level test does.
- New SQL functions have an integration assertion, including one rejection case.

### Playwright set

Keep this list and add to it sparingly:

1. Home renders Persian `lang` and `dir="rtl"`.
2. Search or category filter writes the query string and shows a result from seed data.
3. Guest checkout with the sandbox provider creates one order.
4. Customer cannot open another customer's order.
5. Catalog manager publishes a product that then appears on the storefront.

### Accessibility checks

Playwright can run a focused axe check on home, PDP, cart, and login. Fix serious violations in those pages. Do not boil the ocean on day one, and do not ignore keyboard access on dialogs, menus, and the variant picker.

### CI

Pull requests run lint, typecheck, Vitest, and the integration suite if a database service is available. Playwright runs on the main branch and on release PRs, or on every PR if it stays under a few minutes. See [17-ci-cd.md](17-ci-cd.md).

### What not to test

- shadcn primitive internals.
- Exact Tailwind class strings, unless a class is the behavior (logical properties on one shell component is enough).
- Generated `database.ts`.

## Relevant file paths

```text
apps/web/vitest.config.ts
apps/web/playwright.config.ts
apps/web/tests/e2e/
apps/web/tests/integration/
packages/validation/**/*.test.ts
```

## Environment variables

Integration tests use local Supabase env vars. Playwright uses `NEXT_PUBLIC_SITE_URL` or a `PLAYWRIGHT_BASE_URL` defaulting to `http://localhost:3000`.

CI secrets for Cloudinary and live payments are not required.

## Commands

```bash
pnpm --filter web test
pnpm --filter web test:watch
pnpm --filter web exec playwright test
pnpm --filter web exec playwright test --ui
```

Integration tests assume `pnpm supabase:start` and a migrated database. Document the requirement in the test file header and fail with a clear message if the URL is missing.

## Security notes

- Tests may use the local secret key to arrange fixtures. They must read it from the environment, not from a constant committed as a hosted key.
- Do not record Playwright traces that include production sessions. Traces in CI are artifacts of the test database.
- Fixture emails use a reserved domain such as `example.com`.

## Common mistakes

- Snapshotting entire pages and failing every copy edit.
- Mocking `quote_cart` in the only test that claims to prove the total.
- E2E tests that depend on execution order and leaked rows.
- Skipping RLS tests because "the UI hides the button".
- Asserting English strings the shopper will never see, while the bug is in the Persian empty state.

## Testing strategy

This document is the strategy. The meta-check is CI: a pull request cannot merge with failing Vitest once branch protection exists.

## Future extension points

- Visual regression on `packages/ui` if design reviews need it.
- Load tests on `quote_cart` and listing queries when seed data is large enough to matter.
- Contract tests for a real payment adapter using the provider's sandbox, kept out of the default CI job.
