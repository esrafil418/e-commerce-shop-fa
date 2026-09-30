import { describe, expect, it } from "vitest";
import {
  decideAccountAccess,
  decideAdminAccess,
  decideCheckoutIntent,
  decideGrantRole,
  decideProfileUpdate,
  registrationMetadata,
  requireVerifiedEmail,
} from "./access";
import type { Actor } from "./permissions";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";

function actor(roles: Actor["roles"], emailConfirmed = true): Actor {
  return {
    userId,
    email: "shopper@example.com",
    emailConfirmed,
    roles,
  };
}

describe("access decisions", () => {
  it("sends an anonymous visitor to login", () => {
    expect(decideAccountAccess(null, "/account").kind).toBe("redirect");
    expect(decideAdminAccess(null).kind).toBe("redirect");
    expect(decideProfileUpdate(null, { fullName: "آزاده", phone: "" }).ok).toBe(
      false,
    );
    expect(decideGrantRole(null, { userId, role: "admin" }).ok).toBe(false);
  });

  it("allows an authenticated customer into the account and not the admin", () => {
    const customer = actor(["customer"]);
    expect(decideAccountAccess(customer, "/account").kind).toBe("allow");
    expect(decideAdminAccess(customer).kind).toBe("forbidden");
  });

  it("allows staff into admin and still checks the permission", () => {
    expect(decideAdminAccess(actor(["support"])).kind).toBe("allow");
    const granted = decideGrantRole(actor(["admin"]), {
      userId: otherUserId,
      role: "support",
    });
    expect(granted.ok).toBe(true);
    const denied = decideGrantRole(actor(["customer"]), {
      userId: otherUserId,
      role: "admin",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.error.code).toBe("forbidden");
    }
  });

  it("rejects a client role and another user's id on profile update", () => {
    const customer = actor(["customer"]);
    const roleAttempt = decideProfileUpdate(customer, {
      fullName: "آزاده",
      phone: "09120000000",
      role: "admin",
    });
    expect(roleAttempt.ok).toBe(false);
    if (!roleAttempt.ok) {
      expect(roleAttempt.error.code).toBe("forbidden");
    }

    const idor = decideProfileUpdate(customer, {
      fullName: "آزاده",
      phone: "",
      userId: otherUserId,
    });
    expect(idor.ok).toBe(false);
    if (!idor.ok) {
      expect(idor.error.code).toBe("forbidden");
    }
  });

  it("rejects client prices and unverified checkout", () => {
    const customer = actor(["customer"]);
    const tampered = decideCheckoutIntent(customer, {
      cartId: otherUserId,
      total: 1,
    });
    expect(tampered.ok).toBe(false);
    if (!tampered.ok) {
      expect(tampered.error.code).toBe("untrusted_input");
    }

    const unverified = decideCheckoutIntent(actor(["customer"], false), {
      cartId: otherUserId,
    });
    expect(unverified.ok).toBe(false);
    if (!unverified.ok) {
      expect(unverified.error.code).toBe("email_unverified");
    }
    expect(requireVerifiedEmail(actor(["customer"], false)).ok).toBe(false);
  });

  it("does not copy a role into signup metadata", () => {
    expect(registrationMetadata({ fullName: "آزاده" })).toEqual({
      full_name: "آزاده",
    });
    expect(registrationMetadata({ fullName: "  " })).toEqual({});
  });
});
