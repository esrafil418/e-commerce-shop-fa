import "server-only";

import { ClosedRateLimiter, MemoryRateLimiter } from "./memory";
import { PostgresRateLimiter } from "./postgres";
import type { RateLimiter } from "./types";

type EnvSource = Record<string, string | undefined>;

const developmentLimiter = new MemoryRateLimiter();

export function createRateLimiter(source: EnvSource = process.env): RateLimiter {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const secret = source.SUPABASE_SECRET_KEY?.trim() ?? "";
  if (url.length > 0 && secret.length > 0) {
    return new PostgresRateLimiter();
  }
  if (source.VERCEL_ENV === "production") {
    return new ClosedRateLimiter();
  }
  return developmentLimiter;
}
