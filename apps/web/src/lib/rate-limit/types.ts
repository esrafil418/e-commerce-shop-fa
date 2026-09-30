export type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export interface RateLimiter {
  consume(input: RateLimitInput): Promise<RateLimitDecision>;
}

export const authRateLimits = {
  login: { limit: 10, windowMs: 10 * 60 * 1000 },
  recover: { limit: 5, windowMs: 10 * 60 * 1000 },
  register: { limit: 5, windowMs: 10 * 60 * 1000 },
} as const;
