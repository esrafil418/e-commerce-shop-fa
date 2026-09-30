import { describe, expect, it } from "vitest";
import type { AppRole } from "@ecom/validation";
import {
  canManageInventory,
  canManageOrders,
  canManageProducts,
  canManageRoles,
  canModerateReviews,
  permissions,
  permissionsForRoles,
  type Actor,
} from "./permissions";

const userId = "11111111-1111-4111-8111-111111111111";

function actor(roles: readonly AppRole[], emailConfirmed = true): Actor {
  return {
    userId,
    email: "shopper@example.com",
    emailConfirmed,
    roles,
  };
}

describe("permissions", () => {
  it("gives a customer no staff permissions", () => {
    const customer = actor(["customer"]);
    expect(canManageProducts(customer)).toBe(false);
    expect(canManageOrders(customer)).toBe(false);
    expect(canModerateReviews(customer)).toBe(false);
    expect(canManageInventory(customer)).toBe(false);
    expect(canManageRoles(customer)).toBe(false);
  });

  it("maps each staff role to its permissions", () => {
    expect(canModerateReviews(actor(["support"]))).toBe(true);
    expect(canManageOrders(actor(["support"]))).toBe(false);
    expect(canManageProducts(actor(["catalog_manager"]))).toBe(true);
    expect(canManageInventory(actor(["catalog_manager"]))).toBe(true);
    expect(canManageOrders(actor(["catalog_manager"]))).toBe(false);
    expect(canManageOrders(actor(["order_manager"]))).toBe(true);
    expect(canManageProducts(actor(["order_manager"]))).toBe(false);
  });

  it("lets admin imply every permission from one place", () => {
    const granted = permissionsForRoles(["admin"]);
    expect(granted).toEqual(new Set(Object.values(permissions)));
    expect(canManageRoles(actor(["admin"]))).toBe(true);
    expect(canManageProducts(actor(["admin"]))).toBe(true);
  });

  it("denies a missing actor", () => {
    expect(canManageProducts(null)).toBe(false);
  });
});
