import { describe, expect, it } from "vitest";
import { ClosedRateLimiter, MemoryRateLimiter } from "./memory";
import { createRateLimiter } from "./index";

describe("rate limiter", () => {
  it("stops a key after the limit inside one window", async () => {
    let now = 1_000;
    const limiter = new MemoryRateLimiter(() => now);
    const input = { key: "login:127.0.0.1", limit: 2, windowMs: 10_000 };

    expect((await limiter.consume(input)).allowed).toBe(true);
    expect((await limiter.consume(input)).allowed).toBe(true);
    const blocked = await limiter.consume(input);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    now += 10_000;
    expect((await limiter.consume(input)).allowed).toBe(true);
  });

  it("fails closed in production when the database limiter is not configured", async () => {
    const limiter = createRateLimiter({ VERCEL_ENV: "production" });
    expect(limiter).toBeInstanceOf(ClosedRateLimiter);
    expect(
      (await limiter.consume({ key: "login:x", limit: 10, windowMs: 1000 }))
        .allowed,
    ).toBe(false);
  });

  it("uses the in-memory adapter for local development", () => {
    expect(createRateLimiter({})).toBeInstanceOf(MemoryRateLimiter);
  });
});
