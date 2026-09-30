import { describe, expect, it } from "vitest";
import { redact } from "./logger";

describe("redact", () => {
  it("removes secrets and keeps the event name", () => {
    expect(
      redact({
        event: "auth.login_failed",
        password: "secret-value",
        guestToken: "cart-token",
        nested: { authorization: "Bearer abc" },
      }),
    ).toEqual({
      event: "auth.login_failed",
      password: "[redacted]",
      guestToken: "[redacted]",
      nested: { authorization: "[redacted]" },
    });
  });
});
