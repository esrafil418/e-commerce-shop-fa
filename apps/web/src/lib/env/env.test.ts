import { describe, expect, it } from "vitest";
import { readPublicEnv } from "./public";
import { requireServerEnv } from "./server";

describe("environment", () => {
  it("rejects a trailing slash on the site URL", () => {
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000/",
      }),
    ).toThrow(/trailing slash|must not end with a slash/i);
  });

  it("rejects a service-role value in the public key", () => {
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOi.service_role.sig",
      }),
    ).toThrow(/service-role/i);
  });

  it("explains a missing server secret", () => {
    expect(() => requireServerEnv("SUPABASE_SECRET_KEY", {})).toThrow(
      /SUPABASE_SECRET_KEY/,
    );
  });
});
