import { describe, expect, it } from "vitest";
import { sanitizeRedirectPath } from "./redirect";
import { requiresSession } from "@/lib/supabase/proxy";

describe("sanitizeRedirectPath", () => {
  it("keeps a relative path", () => {
    expect(sanitizeRedirectPath("/account")).toBe("/account");
    expect(sanitizeRedirectPath("/admin/orders?page=2")).toBe(
      "/admin/orders?page=2",
    );
  });

  it("rejects open redirects", () => {
    expect(sanitizeRedirectPath("https://evil.example")).toBe("/");
    expect(sanitizeRedirectPath("//evil.example")).toBe("/");
    expect(sanitizeRedirectPath("/\\evil.example")).toBe("/");
    expect(sanitizeRedirectPath("/%2F%2Fevil.example")).toBe("/");
  });
});

describe("requiresSession", () => {
  it("protects account, profile, and admin pages", () => {
    expect(requiresSession("/account")).toBe(true);
    expect(requiresSession("/profile")).toBe(true);
    expect(requiresSession("/profile/orders")).toBe(true);
    expect(requiresSession("/admin/products")).toBe(true);
    expect(requiresSession("/auth/login")).toBe(false);
    expect(requiresSession("/cart")).toBe(false);
    expect(requiresSession("/api/admin/permissions")).toBe(false);
  });
});
