# 05. Authentication

Status: architectural baseline. Supabase Auth is the identity provider. No auth code exists yet.

## Purpose

Define how people register, sign in, recover passwords, verify email, and how the Next.js app keeps a session. Authorization is the next document.

## Architecture decisions

- Supabase Auth with email and password.
- Sessions live in cookies managed by `@supabase/ssr`. The app does not put access tokens in `localStorage` or Zustand.
- Next.js 16 refreshes the session in `apps/web/src/proxy.ts` by calling `supabase.auth.getClaims()` and copying cookies onto the request and the response.
- Browser code uses `createBrowserClient` from `@supabase/ssr`. Server code uses `createServerClient` with `cookies()` from `next/headers`.
- The publishable key is the client key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- Email verification is required before checkout payment. Browsing and a guest cart are allowed before verification.
- Password recovery uses Supabase recovery emails. The reset link hits an auth confirm Route Handler, then `/auth/update-password`.
- A trigger creates `profiles` and the `customer` role when `auth.users` gains a row.
- Staff accounts are not self-serve. An admin creates them or promotes a user by writing `user_roles`.

The older package `@supabase/auth-helpers-nextjs` is not used.

## Important concepts

**Session cookie.** httpOnly cookies set by the Supabase SSR client. JavaScript on the page does not read the access token.

**`getClaims()`.** Verifies the JWT and refreshes it. This is what the proxy calls. Do not authorize with `getSession()` alone; it trusts the cookie payload without a round trip.

**`getUser()`.** Server-side check that loads the user from Auth. Use it in Server Actions that need the current user id.

**Guest.** No Supabase user. A separate httpOnly cart cookie identifies the cart. Guest checkout collects an email on the order. Login merges the guest cart into the user cart.

**Confirm route.** `app/auth/confirm/route.ts` exchanges `token_hash` / `code` for a session and redirects. This is required because the browser client cannot finish every email link by itself in the App Router.

## Implementation details

### Clients

`lib/supabase/client.ts` — Client Components.

`lib/supabase/server.ts` — Server Components, Server Actions, Route Handlers. `cookies()` is async on current Next.js. If `setAll` throws inside a Server Component, ignore it; the proxy is responsible for refreshing cookies.

`lib/supabase/secret.ts` — `server-only`, secret key. Not part of ordinary login.

`src/proxy.ts` — matcher covers storefront, account, and admin. Skip static assets.

### Flows

**Register.** Form posts a Server Action. Zod checks email and password length. The action calls `supabase.auth.signUp` with `emailRedirectTo` pointing at the confirm route. The UI shows a success state: check your inbox. It does not pretend the user is fully signed in if confirmation is still pending.

**Login.** `signInWithPassword`. On success, `mergeGuestCart` runs on the server, then redirect to `next` if it is a relative path. Open redirects are rejected.

**Logout.** Server Action calls `signOut` and clears the guest cart cookie only if you intend to detach it. Default: leave the guest cart cookie absent for a user cart; do not assign the user cart to a new guest.

**Forgot password.** `resetPasswordForEmail`. Same confirm route with type `recovery`. Update-password page calls `updateUser({ password })`.

**Email change and profile.** Profile name and phone live in `profiles`, updated by a Server Action. Email changes go through Supabase so verification still happens.

### Route protection

- `(account)` layout: if there is no user, redirect to `/auth/login?next=...`.
- `admin` layout: if there is no user, redirect to login. If the user lacks a staff role, render a forbidden state, not a redirect loop.
- Proxy refreshes cookies. It does not replace the layout checks. Proxy-level redirects are acceptable for `/admin` and `/account` as a fast path, with the layout check as the backup.

### Password rules

Minimum 8 characters at the application schema. Supabase dashboard settings must match or be stricter. Do not invent a custom hasher.

### Copy and states

Each auth screen has loading (pending action), field errors, a form-level error, an empty/initial form, and a success message. Strings come from `messages/fa.ts`.

## Relevant file paths

```text
apps/web/src/proxy.ts
apps/web/src/lib/supabase/client.ts
apps/web/src/lib/supabase/server.ts
apps/web/src/lib/supabase/secret.ts
apps/web/src/app/auth/confirm/route.ts
apps/web/src/app/(auth)/auth/login/page.tsx
apps/web/src/app/(auth)/auth/register/page.tsx
apps/web/src/app/(auth)/auth/forgot/page.tsx
apps/web/src/app/(auth)/auth/update-password/page.tsx
apps/web/src/features/auth/
packages/validation/src/auth.ts
supabase/migrations/*_profiles_trigger.sql
```

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Supabase dashboard:

- Site URL = `NEXT_PUBLIC_SITE_URL`
- Redirect allow list includes `/auth/confirm` and the update-password URL
- Email confirmations enabled
- SMTP for production (Supabase default mailer is for development)

`SUPABASE_SECRET_KEY` is used when an admin action must call the Auth admin API (invite staff, ban). It is not used for customer login.

## Commands

```bash
pnpm supabase:start
pnpm --filter web dev
```

Local inbox: Supabase Studio (Inbucket or the local mail UI the CLI prints) captures confirmation emails. Do not configure production SMTP in `.env.local`.

## Security notes

- Cookie options from `@supabase/ssr` stay intact. Do not roll a custom token store.
- The `next` redirect parameter must start with a single `/` and must not start with `//`.
- Rate limiting: rely on Supabase Auth limits and add a server-side throttle on login and recovery actions before launch (see [06-authorization-and-security.md](06-authorization-and-security.md)).
- Never log passwords, access tokens, or refresh tokens.
- Service-role auth admin calls happen only after `has_role(..., 'admin')` on the caller.

## Common mistakes

- Reading the user in a Client Component from a Zustand cache and treating it as authorization.
- Using `middleware.ts` on Next.js 16.
- Calling `createServerClient` once at module scope. Cookies differ per request; build the client inside the function.
- Skipping the confirm Route Handler and then debugging missing sessions after email links.
- Storing roles in `user_metadata`.

## Testing strategy

- Vitest for the `next` redirect sanitizer and Zod auth schemas.
- Playwright: register against local Supabase (or a test project), confirm via the local mail API if it is stable, login, logout, and a rejected open redirect.
- A server test that `getSession` is not imported in `features/auth/actions`.

If the local mail API is too brittle, Playwright may seed a confirmed user with the Auth admin API and the local secret key inside the test harness only.

## Future extension points

- Magic link or OTP, using the same cookie client.
- OAuth providers, same confirm/callback route. Not required for the résumé scope.
- Step-up confirmation for email and password changes.
- Session revocation UI listing Supabase sessions, later.
