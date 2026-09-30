# 07. Cloudinary

Status: architectural baseline. No Cloudinary account is wired yet. Catalog UI can ship with known `public_id` fixtures before the upload UI exists.

## Purpose

Define where media bytes live, how they get there, and how PostgreSQL stays the source of truth for which image belongs to which product.

## Architecture decisions

- Cloudinary stores product images, brand logos, banners, and optional product videos.
- PostgreSQL stores `cloudinary_public_id`, alt text, dimensions, kind, and sort order in `product_media`. It does not store a hand-built URL as the only reference. URLs are derived so transformations can change without a data migration.
- Uploads are **signed**. The API secret stays on the server. The browser receives a short-lived signature and uploads the file directly to Cloudinary.
- Unsigned upload presets are not used.
- The Next.js server does not proxy the bytes of a normal admin upload. Signing is a small JSON response. Direct upload avoids putting video-sized bodies through the application server.
- Delivery uses Cloudinary transformations (`f_auto`, `q_auto`, width as needed) and `next/image` with a remote pattern for `res.cloudinary.com`, or the current Cloudinary Next.js component if its loader is the supported path at implementation time. Verify the package README when adding the dependency. Do not guess component props.
- Deleting a media row does not immediately delete the Cloudinary asset. An explicit admin action calls the destroy API. This avoids breaking an order snapshot or a cached page that still mentions the id. Orphan cleanup can be a later job.

Recorded in [adr/0004-media-storage.md](adr/0004-media-storage.md).

## Important concepts

**public_id.** Cloudinary's identifier, for example `products/01H.../front`. Stored in Postgres.

**Signature.** HMAC of the upload parameters using `CLOUDINARY_API_SECRET`. Whoever can mint signatures can upload into the account. Minting requires a staff session.

**Transformation.** A URL instruction (`w_800,c_limit,f_auto,q_auto`) applied at delivery. The original stays in Cloudinary.

**Alt text.** Required for product images (`alt_fa`). The database column is not null for `kind = image` once the admin form is in place. Decorative banner text may use an empty alt only when the banner has a separate text title in HTML.

## Implementation details

### Upload flow

1. Catalog manager drops a file in the admin product form.
2. Client asks `POST /api/admin/uploads/sign` with `{ folder, resourceType }` where `resourceType` is `image` or `video`.
3. The Route Handler checks the role, builds params:
   - `timestamp` (unix seconds)
   - `folder` restricted to `products`, `brands`, or `banners`
   - `allowed_formats` appropriate to the type
   - a size limit expressed with Cloudinary's current upload parameters (confirm the parameter name in the Cloudinary signing docs at implementation time)
4. The handler signs those params with the official Cloudinary Node SDK (`cloudinary.utils.api_sign_request` or the equivalent documented helper). It returns `{ signature, timestamp, apiKey, cloudName, folder }`.
5. The browser uploads to Cloudinary's upload endpoint with that signature.
6. On success, the client sends `public_id`, `width`, `height`, `resource_type`, and `alt_fa` to a Server Action.
7. The action checks the role again, checks that `public_id` starts with an allowed folder, and inserts `product_media`.

The client never chooses the API secret, and it does not choose an arbitrary folder outside the allow list. The signature would not match if it changed the signed folder.

### Delivery

`lib/cloudinary/delivery.ts` exports a function that accepts `publicId` and a preset name (`card`, `gallery`, `thumb`, `banner`). Presets map to widths. The function returns a URL on `res.cloudinary.com`.

Product cards request the `card` preset. The gallery requests `gallery`. Do not use the original multi-megabyte asset in a grid.

`next.config.ts` `images.remotePatterns` includes:

```ts
{ protocol: "https", hostname: "res.cloudinary.com" }
```

Confirm the exact `images` config shape against the installed Next.js 16 docs. Next.js 16 changed some image defaults.

### Video

`kind = video` uses Cloudinary video delivery. The product page renders a video element only when a video row exists. There is no requirement that every product has video. Posters use a derived thumbnail if Cloudinary's documented thumbnail transformation is available; otherwise the first image is the poster.

### Placeholders

Seed data may point at a small set of Cloudinary sample ids or at explicitly generated placeholder images in the project account. Do not hotlink arbitrary third-party CDNs.

## Relevant file paths

```text
apps/web/src/lib/cloudinary/delivery.ts
apps/web/src/lib/cloudinary/sign-upload.ts
apps/web/src/app/api/admin/uploads/sign/route.ts
apps/web/src/features/admin/catalog/ui/MediaManager.tsx
supabase/migrations/*_product_media.sql
```

## Environment variables

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=    # delivery URLs in the browser
CLOUDINARY_API_KEY=                   # returned to the browser as part of a signed upload
CLOUDINARY_API_SECRET=                # server only, never NEXT_PUBLIC_
```

The API key is not sufficient to sign or destroy assets. It may appear in the browser upload request. The secret may not.

## Commands

No Cloudinary CLI is required. Local development uses the same cloud as a non-production Cloudinary environment, or a dedicated "dev" cloud. Do not use production media credentials in `.env.local` if a dev cloud exists.

```bash
pnpm --filter web dev
```

Upload signing is exercised from the admin UI once Phase 10 is built.

## Security notes

- `sign-upload.ts` imports `server-only`.
- Limit signed resource types and folders.
- Reject `public_id` values that contain `..` or a scheme.
- Do not log the signature response together with the secret.
- Staff who can sign uploads can put files in the allowed folders. That is an accepted power of `catalog_manager`.
- Customer avatars, if added later, get a different folder and a tighter size limit. They are not in the first media slice.

## Common mistakes

- Storing only a fully transformed URL, then being unable to change quality settings.
- An unsigned preset "just for the demo".
- Building delivery URLs in twenty components instead of `lib/cloudinary/delivery.ts`.
- Using the Cloudinary secret from a Client Component because an example did.
- Forgetting `remotePatterns` and having `next/image` refuse the host.
- Serving the original 4000px image on a mobile product card.

## Testing strategy

- Unit tests for the delivery helper: given a public id and preset, the URL contains the cloud name, the public id, and the expected width.
- Unit tests that folder allow-listing rejects `../` and unknown roots.
- Route test or Playwright: anonymous `POST /api/admin/uploads/sign` is 401; a customer is 403.
- A manual or Playwright upload test against a dev cloud once credentials exist. CI does not need live Cloudinary for every pull request. Gate the live test behind the presence of secrets.

## Future extension points

- Eager transformations at upload time if delivery latency shows up in traces.
- A destroy-and-replace flow that writes the audit log.
- Private assets for invoices. Those would use authenticated delivery, not the public product folder. Do not mix them into `product_media`.
- Responsive `srcset` if `next/image` is not covering the gallery well enough.
