import { describe, expect, it } from "vitest";
import { accountSessionResponse, adminPermissionsResponse } from "./http";
import type { Actor } from "./permissions";

const actor: Actor = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "shopper@example.com",
  emailConfirmed: true,
  roles: ["customer"],
};

describe("auth http responses", () => {
  it("returns 401 when nobody is signed in", () => {
    expect(accountSessionResponse(null).status).toBe(401);
    expect(adminPermissionsResponse(null).status).toBe(401);
  });

  it("returns the session without a token", () => {
    const response = accountSessionResponse(actor);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toMatch(/token|cookie/i);
  });

  it("returns 403 when a customer calls an admin route", () => {
    expect(adminPermissionsResponse(actor).status).toBe(403);
  });

  it("returns permissions for a staff session", () => {
    const response = adminPermissionsResponse({
      ...actor,
      roles: ["catalog_manager"],
    });
    expect(response.status).toBe(200);
    if (response.body.ok) {
      expect(response.body.data.permissions).toContain(
        "catalog.products.manage",
      );
      expect(response.body.data.permissions).not.toContain("roles.manage");
    }
  });
});
