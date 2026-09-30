# 12. Orders and payments

Status: architectural baseline. The payment integration in the first release is a sandbox provider behind an interface. A live Iranian gateway is a later adapter, not a blocker for the order model.

## Purpose

Define order lifecycle, payment capture, shipments, cancellation, returns, and refunds. Prices on an order are historical snapshots.

## Architecture decisions

- An order is created only by `place_order`.
- Line items store sku, name, quantity, and rial amounts at that moment.
- The payment provider is an interface in `features/orders/payments/`. The first implementation is `sandbox`.
- Provider webhooks are Route Handlers. They verify a signature, then call SQL. They use the secret Supabase client only inside that handler because the caller has no user JWT.
- Order status is a closed set. Clients cannot post a new status. Staff actions call named transitions (`cancel_order`, `mark_shipped`) that check the current status.
- Invoices are a printable view of the order (and a stable invoice number equal to the order number) until a legal requirement needs a separate immutable document table.
- Currency on the order row is always `IRR`, stored implicitly by using rial columns. A `currency_code` column defaulting to `IRR` makes a future currency explicit without converting money in the first release.

## Important concepts

**Order number.** Allocated from a Postgres sequence, displayed as `ORD-100001`. Unique.

**Payment status.** `pending`, `authorized`, `paid`, `failed`, `refunded`, `partially_refunded`. Separate from fulfillment status so a paid order can still be unshipped.

**Fulfillment status.** `pending_payment`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `return_requested`, `returned`.

The order row stores fulfillment status. The payment row stores payment status. The UI may show both.

**Sandbox provider.** A staff or developer action, or an automatic success in local dev, posts a signed fake webhook. It exists so checkout can be demonstrated without a merchant account.

## Implementation details

### Allowed transitions

```text
pending_payment → paid        (payment recorded)
pending_payment → cancelled   (shopper or expiry job, if not paid)
paid → processing
processing → shipped          (requires tracking code)
shipped → delivered
paid|processing → cancelled   (restock if not shipped)
delivered → return_requested  (shopper request)
return_requested → returned   (staff)
returned → refund completed on the payment
```

Illegal transitions raise in SQL. Restock happens in the cancel function, not in the UI.

### Shopper surfaces

- `/account/orders` list with empty, loading, and error states.
- `/account/orders/[number]` detail, shipment tracking code, cancel button when the transition allows, return request form when delivered.
- Guest lookup: `/orders/track` with order number **and** email, both matched, so the number alone is not a capability URL. Session users do not need this form for their own orders.

### Cancellation

Shoppers cancel only in `pending_payment` and, if settings allow, `paid` before `processing`. The Server Action calls `cancel_order`. Inventory returns through the same inventory rows. A paid cancellation creates a refund in `pending` for the sandbox provider to mark `refunded`.

### Returns

`return_requests` store order id, reason code, note, status `submitted|approved|rejected|received`. Shoppers create `submitted`. Order managers approve. Receiving the goods sets the order to `returned` and opens a refund for the quoted amount (full refund in the first version; partial quantities can be a column from the start so the later UI does not need a migration surprise: `quantity` per line on `return_request_items`).

### Payments interface

```text
createPayment(order) → { redirectUrl | null, providerRef }
handleWebhook(rawBody, headers) → verified event
refund(payment, amountRial) → provider result
```

`features/orders/payments/sandbox.ts` implements this. A future `zarinpal.ts` (or another gateway) implements the same functions after a business decision. Webhook routes dispatch on the provider name. Unknown providers 404.

The sandbox webhook secret is `PAYMENT_WEBHOOK_SECRET`. Local development can use a documented dummy in `.env.example` such as an empty value that the sandbox refuses until set, so there is no universal secret in git.

### Idempotency

`payments.idempotency_key` and `payment_events` unique on `(payment_id, provider_event_id)`. Replaying a webhook does not double-apply `paid`.

### Customer copy

Status labels are Persian in `messages/fa.ts`. The database stores the English-stable codes above.

## Relevant file paths

```text
apps/web/src/features/orders/
apps/web/src/features/orders/payments/types.ts
apps/web/src/features/orders/payments/sandbox.ts
apps/web/src/app/api/payments/[provider]/route.ts
apps/web/src/app/(account)/account/orders/
apps/web/src/app/(store)/orders/track/page.tsx
apps/web/src/app/admin/orders/
supabase/migrations/*_orders.sql
supabase/migrations/*_order_transitions.sql
```

## Environment variables

```bash
PAYMENT_PROVIDER=sandbox
PAYMENT_WEBHOOK_SECRET=
```

Live gateway keys, when they exist, are server-only and named after the provider (`ZARINPAL_MERCHANT_ID` or whatever that provider's current docs require). Do not add them until the adapter is actually written. Verify parameter names against the provider's docs at that time.

## Commands

```bash
pnpm --filter web test
pnpm --filter web exec playwright test tests/e2e/checkout.spec.ts
```

## Security notes

- Tracking by number plus email uses a constant-time compare where practical and a generic error ("order not found").
- Webhook handlers do not use the publishable client to update payments if RLS would block the anonymous caller. They verify the signature first, then use the secret client or a narrowly granted definer function.
- Refund actions require `order_manager` or `admin`.
- Do not log full payment payloads in production.

## Common mistakes

- Setting order status from a form select that posts the next status as a free string.
- Marking paid in the client after redirect, before the webhook.
- Restocking in application code that can crash between status update and stock update. One SQL function.
- Using the product's current price on the invoice.
- Treating sandbox as available in production because the env var was copied.

## Testing strategy

- Transition tests: illegal edges throw; cancel restocks; double webhook yields one paid payment.
- Playwright happy path with sandbox.
- Authorization test: customer A cannot open customer B's order URL.
- Track form test: correct number with wrong email fails.

## Future extension points

- A real payment adapter behind the same interface.
- Partial captures and partial refunds (columns already anticipate amounts).
- Separate `invoices` table and PDF generation.
- Shipment provider APIs. The first version stores a tracking code entered by staff.
- Notification fan-out on transition (see notifications feature) without putting email inside the SQL function. The function can insert a `notifications` row; a dispatcher sends email later.
