import "server-only";

import { formatEnvError, serverEnvSchema, type ServerEnv } from "./schema";

type EnvSource = Record<string, string | undefined>;

export type ServerSecretKey =
  | "SUPABASE_SECRET_KEY"
  | "CLOUDINARY_API_KEY"
  | "CLOUDINARY_API_SECRET";

export function readServerEnv(source: EnvSource = process.env): ServerEnv {
  const level = source.LOG_LEVEL?.trim() || "info";
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY ?? "",
    CLOUDINARY_API_KEY: source.CLOUDINARY_API_KEY ?? "",
    CLOUDINARY_API_SECRET: source.CLOUDINARY_API_SECRET ?? "",
    LOG_LEVEL: level,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables.\n${formatEnvError(parsed.error)}\nSet them in apps/web/.env.local. Never prefix secrets with NEXT_PUBLIC_.`,
    );
  }

  return parsed.data;
}

export function requireServerEnv(
  key: ServerSecretKey,
  source: EnvSource = process.env,
): string {
  const value = readServerEnv(source)[key].trim();
  if (value.length > 0) {
    return value;
  }

  throw new Error(
    `Missing server environment variable ${key}.\nAdd it to apps/web/.env.local. Do not use the NEXT_PUBLIC_ prefix.\nSee docs/02-development-environment.md.`,
  );
}
