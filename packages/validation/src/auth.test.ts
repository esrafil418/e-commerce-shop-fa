import { describe, expect, it } from "vitest";
import { emailSchema, passwordSchema, profileUpdateSchema } from "./auth";

describe("emailSchema", () => {
  it("rejects an empty email", () => {
    const result = emailSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("accepts a normal address", () => {
    const result = emailSchema.safeParse("shopper@example.com");
    expect(result.success).toBe(true);
  });

  it("rejects a short password", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
  });

  it("rejects a profile payload that tries to set a role", () => {
    const result = profileUpdateSchema.safeParse({
      fullName: "آزاده",
      phone: "",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});
