# 19. Deployment

Status: architectural baseline. Nothing is deployed yet.

## Purpose

Describe the three hosts, the environments, and the order of operations for a release.

## Architecture decisions

- **Vercel** runs `apps/web`.
- **Supabase** runs PostgreSQL and Auth.
- **Cloudinary** stores media.
- Environments: `local`, `preview`, `production`. Each has its own Supabase project (or local stack) and its own keys. Preview and production do not share a database.
- Production `PAYMENT_PROVIDER` is `sandbox` only until a real provider is intentionally enabled. A demo production may keep sandbox if the site is clearly not charging real money. The setting is explicit, not implied.
- Domain and TLS are Vercel's. `NEXT_PUBLIC_SITE_URL` matches the canonical domain.
- Region: choose a Supabase region close to the Vercel region when the projects are created, and record the choice in this file. No region is selected yet.

## Important concepts

**Preview.** Per-branch Vercel deployment. Safe to break. Uses preview keys.

**Production.** The public origin. Migrations applied deliberately.

**Secret split.** Publishable Supabase key and Cloudinary cloud name are public. Secret key, Cloudinary secret, and webhook secret are server env vars on Vercel, marked sensitive.

## Implementation details

### First production setup

1. Create the Supabase production project. Enable email confirmation. Set site URL and redirect allow list.
2. Create the Cloudinary production cloud (or a dedicated folder policy on a paid account).
3. Create the Vercel project from this Git repository. Set the root/build as decided in [17-ci-cd.md](17-ci-cd.md).
4. Enter environment variables for Production and Preview separately.
5. From a trusted machine, link the Supabase CLI to the production project and `supabase db push` the migrations. Then run a minimal production bootstrap (admin user created by the Auth dashboard or a one-off script), not the demo seed full of sample products, unless this environment is a public demo.
6. Deploy the application.
7. Hit `/api/health`. Sign in. Confirm a published product renders and an image URL is on `res.cloudinary.com`.

### Ongoing release

Follow the migration order in [17-ci-cd.md](17-ci-cd.md).

### Rollback

Vercel can promote a previous deployment. If the new deployment required a migration that the old code cannot read, roll back the code only after restoring a compatible schema, or roll forward with a fix. This is why destructive migrations are expand-then-contract.

Database backups are Supabase's. Know how to restore before the site takes real orders. Practice is a future operational task, not part of the documentation phase.

### Local vs hosted differences

| | Local | Hosted |
| --- | --- | --- |
| Auth mail | Supabase local inbox | Configured SMTP |
| Keys | CLI output in `.env.local` | Vercel env |
| Media | Dev cloud | Prod cloud |
| Payments | Sandbox | Sandbox until switched |
| Cookies `Secure` | off on http localhost | on |

## Relevant file paths

```text
apps/web/next.config.ts
apps/web/.env.example
supabase/migrations/
docs/17-ci-cd.md
```

## Environment variables

Production and preview each define the full set in [02-development-environment.md](02-development-environment.md) plus payment variables from [12-orders-and-payments.md](12-orders-and-payments.md).

`NEXT_PUBLIC_SITE_URL` differs per environment.

## Commands

```bash
pnpm --filter web build
supabase db push
```

`supabase db push` is run by a person with the CLI logged in, against a linked project. It is not a script hooked to every `git push` in this baseline.

## Security notes

- Separate Supabase projects mean a leaked preview key is not production.
- Do not enable the Supabase service role in the browser "to debug production".
- Restrict the production Auth redirect allow list to the real origin.
- Cloudinary production secret rotates if it ever lands in a log or a ticket.
- Demo seed data is not customer data, but do not copy a production dump into the repo to reproduce a bug. Write a minimal fixture.

## Common mistakes

- One Supabase project for preview and production.
- Forgetting to add the auth confirm URL to the allow list, so login works locally and email links fail in production.
- Deploying before `db push` and debugging "column does not exist" in the UI.
- `NEXT_PUBLIC_SITE_URL` left as `http://localhost:3000` on Vercel, poisoning canonical URLs.
- Using unsigned Cloudinary uploads in production because signing was "phase 2" and then never done. Signing is part of the media phase before public staff use.

## Testing strategy

- Preview deployment is the staging test: Playwright can target `PLAYWRIGHT_BASE_URL` when someone runs it manually.
- `/api/health` is the post-deploy smoke check.
- There is no automated production synthetic test in the baseline. Add one when the domain exists.

## Future extension points

- Supabase branching wired to Vercel previews.
- A staging environment that is neither preview-per-PR nor production.
- WAF rules on auth and checkout routes.
- Backup restore drill recorded as a short runbook in this document.
