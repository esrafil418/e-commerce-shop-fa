import { describe, expect, it } from "vitest";
import { emailSchema } from "./auth";

describe("emailSchema", () => {
  it("rejects an empty email", () => {
    const result = emailSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("accepts a normal address", () => {
    const result = emailSchema.safeParse("shopper@example.com");
    expect(result.success).toBe(true);
  });
});
