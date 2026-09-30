import { formatEnvError, publicEnvSchema, type PublicEnv } from "./schema";

type EnvSource = Record<string, string | undefined>;

export function readPublicEnv(source: EnvSource = process.env): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SITE_URL:
      source.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
      source.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables.\n${formatEnvError(parsed.error)}\nCopy apps/web/.env.example to apps/web/.env.local and fix the values. See docs/02-development-environment.md.`,
    );
  }

  if (
    source.VERCEL_ENV === "production" &&
    parsed.data.NEXT_PUBLIC_SITE_URL.includes("localhost")
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL still points at localhost in production. Set the public site origin in the hosting project.",
    );
  }

  return parsed.data;
}
