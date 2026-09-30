# 18. Observability

Status: architectural baseline. The first implementation is structured logs and error boundaries. A vendor SDK is added only when someone will actually read it.

## Purpose

Define how failures are seen, what is logged, and what is deliberately not logged.

## Architecture decisions

- `apps/web/src/lib/observability/logger.ts` is the only logger feature code calls. It writes JSON to stdout in production and a readable line in development.
- Levels: `info`, `warn`, `error`. Default level from `LOG_LEVEL`, default `info`.
- Unhandled UI errors hit `error.tsx` and `global-error.tsx`, which call the logger with the digest Next.js provides. They show a Persian message and a retry. They do not show stack traces to shoppers.
- Server Actions log unexpected exceptions with a stable `event` name (`cart.add_failed`, `order.place_failed`) and an error name. They return a generic Persian message to the client.
- There is no Sentry (or similar) dependency in the initial install. The logger is the hook: one module can later forward `error` events to a vendor.
- Database health is a `GET /api/health` route that runs a trivial query (`select 1` via RPC or a public `health` check that does not touch customer data) and returns 200 or 503. It does not require a session and does not reveal versions of internal packages beyond a simple `{ ok: true }`.
- Analytics for the business (revenue, counts) are SQL on the admin dashboard, not a third-party tracker in the first release. If a storefront analytics tool is added later, it must not receive addresses, emails, or phone numbers.

## Important concepts

**Event name.** A dotted string, stable for searching: `checkout.quote_failed`.

**Digest.** Next.js error digest shown to the user as a reference code. Support can match it to a log line.

**Redaction.** The logger drops known keys: `password`, `token`, `authorization`, `cookie`, `apiSecret`, `guestToken`.

## Implementation details

Log shape:

```json
{
  "level": "error",
  "event": "order.place_failed",
  "message": "reservation expired",
  "requestId": "…",
  "orderId": "…"
}
```

`requestId` comes from the `x-request-id` header or a UUID generated in the action. Do not log the full address snapshot or the payment body.

Vercel captures stdout. That is the log viewer until a vendor exists.

Admin audit logs are a different system: business history in `audit_logs`, not a replacement for error logs.

Reservation expiry and other jobs log `reservations.released` with a count.

## Relevant file paths

```text
apps/web/src/lib/observability/logger.ts
apps/web/src/app/error.tsx
apps/web/src/app/global-error.tsx
apps/web/src/app/api/health/route.ts
apps/web/src/features/*/actions/
```

## Environment variables

```bash
LOG_LEVEL=info
```

A future vendor DSN would be server-only (`SENTRY_DSN` or similar). Do not add the variable until the package is added.

## Commands

```bash
pnpm --filter web dev
```

Trigger a known bad RPC in development and confirm one JSON error line and a Persian UI message.

Health:

```bash
curl -s http://localhost:3000/api/health
```

## Security notes

- Never log cookies, passwords, guest tokens, webhook signatures, or the Cloudinary secret.
- Health checks do not connect with a connection string embedded in the response.
- 404 vs 403: order detail returns not-found for both missing and not-owned orders so we do not reveal that another person's order number exists. The log on the server may include the real reason at `info` without including the other user's email.

## Common mistakes

- `console.log` of the whole Server Action input, which will eventually include an address.
- Showing `error.message` from Postgres directly in the UI. Constraint names can leak schema. Map known errors; hide the rest.
- A health route that selects from `orders`.
- Adding three analytics SDKs in the root layout before there is a measurement plan.

## Testing strategy

- Unit test: the redaction helper removes `password` and `guestToken` from a sample object.
- A component test that the error boundary renders the Persian fallback and not a stack trace (the boundary can be rendered with RTL's utilities by throwing in a child).
- Manual: health route returns 503 when Supabase is stopped, once the route exists.

## Future extension points

- Forward logger `error` to a hosted error tracker.
- Request metrics (count, duration) if Vercel's built-in metrics are not enough.
- Alerting on `order.place_failed` rate and health 503.
- Correlation between `audit_logs.actor_id` and log lines via `requestId` stored on the audit row.
