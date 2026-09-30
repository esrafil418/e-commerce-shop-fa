# 0004. Cloudinary for media bytes

- Status: Accepted
- Date: 2026-09-30

## Purpose

Choose where images and product videos live, and how they are allowed to get there.

## Context

PostgreSQL should not store binary bodies. The storefront needs resized, modern formats. Staff need an upload path. The Cloudinary API secret must not ship to the browser. Supabase Storage was an option because the project already uses Supabase.

## Decision

Use Cloudinary for product images, optional product videos, brand logos, and banners.

Store `cloudinary_public_id` and presentation metadata in `product_media`. Build delivery URLs in `lib/cloudinary/delivery.ts` with named presets.

Uploads are signed on the server after a staff role check. The browser uploads directly to Cloudinary. There is no unsigned upload preset.

`next/image` is allowed to load `res.cloudinary.com`.

Deleting a database row does not automatically destroy the remote asset.

Full flow: [../07-cloudinary.md](../07-cloudinary.md).

## Consequences

- A Cloudinary account is required before real uploads. Catalog pages can render with fixture public ids before that.
- Transformations can change without rewriting rows.
- The sign route is a privileged endpoint and needs tests for 401 and 403.
- The API key is visible to the uploading browser. The API secret is not.

## Alternatives considered

- **Supabase Storage.** Coherent with the database host and simpler credentials. Rejected as the primary media store because the product direction asks for Cloudinary transformations and signed uploads, and delivery presets are the point of the media layer. Supabase Storage remains a reasonable place for private files (future invoice PDFs) under a separate ADR.
- **Bytes in Postgres.** Rejected. Backups and the Next.js server should not move multi-megabyte originals on every request.
- **Unsigned uploads.** Rejected. Anyone who can load the admin JS could fill the account.

## Implementation details

Allowed folders: `products`, `brands`, `banners`. The Server Action that records `public_id` checks the prefix again. Signatures expire. Resource type is `image` or `video` only.

## Relevant file paths

```text
apps/web/src/lib/cloudinary/delivery.ts
apps/web/src/lib/cloudinary/sign-upload.ts
apps/web/src/app/api/admin/uploads/sign/route.ts
```

## Environment variables

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Only the cloud name is public.

## Commands

No CLI. Upload is exercised in the admin UI against a non-production cloud.

## Security notes

`sign-upload.ts` imports `server-only`. CI or a unit test should fail if a client module imports it. Do not log signatures next to secrets. Staff with catalog access can upload into the allowed folders; that is intended.

## Common mistakes

- Persisting a fully transformed URL as the only id.
- Proxying file bytes through a Server Action for large videos.
- Using the production cloud from laptops.

## Testing strategy

Unit tests for presets and folder checks. Auth tests for the sign route. Live upload is optional in CI and runs only when dev credentials are present.

## Future extension points

Authenticated delivery for private documents, in a different folder and table, likely a different ADR if the bytes move to Supabase Storage instead.
