import "server-only";

import { createSupabaseSecretClient } from "@/lib/supabase/secret";
import type {
  RateLimitDecision,
  RateLimiter,
  RateLimitInput,
} from "./types";

export class PostgresRateLimiter implements RateLimiter {
  async consume(input: RateLimitInput): Promise<RateLimitDecision> {
    const denied: RateLimitDecision = {
      allowed: false,
      remaining: 0,
      retryAfterMs: input.windowMs,
    };

    try {
      const supabase = createSupabaseSecretClient();
      const { data, error } = await supabase.rpc("consume_rate_limit", {
        bucket_key: input.key,
        window_seconds: Math.ceil(input.windowMs / 1000),
        max_count: input.limit,
      });

      if (error || !Array.isArray(data) || data.length === 0) {
        return denied;
      }

      const row = data[0] as {
        allowed?: boolean;
        remaining?: number;
        retry_after_seconds?: number;
      };

      if (typeof row.allowed !== "boolean") {
        return denied;
      }

      return {
        allowed: row.allowed,
        remaining: typeof row.remaining === "number" ? row.remaining : 0,
        retryAfterMs:
          typeof row.retry_after_seconds === "number"
            ? row.retry_after_seconds * 1000
            : input.windowMs,
      };
    } catch {
      return denied;
    }
  }
}
