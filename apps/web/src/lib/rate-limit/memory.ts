import type {
  RateLimitDecision,
  RateLimiter,
  RateLimitInput,
} from "./types";

type Bucket = {
  windowStart: number;
  count: number;
};

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async consume(input: RateLimitInput): Promise<RateLimitDecision> {
    const current = this.now();
    const existing = this.buckets.get(input.key);
    const expired =
      !existing || current - existing.windowStart >= input.windowMs;
    const bucket = expired
      ? { windowStart: current, count: 0 }
      : existing;
    bucket.count += 1;
    this.buckets.set(input.key, bucket);

    const retryAfterMs = Math.max(
      bucket.windowStart + input.windowMs - current,
      0,
    );
    const allowed = bucket.count <= input.limit;
    return {
      allowed,
      remaining: Math.max(input.limit - bucket.count, 0),
      retryAfterMs,
    };
  }
}

export class ClosedRateLimiter implements RateLimiter {
  async consume(): Promise<RateLimitDecision> {
    return { allowed: false, remaining: 0, retryAfterMs: 60_000 };
  }
}
