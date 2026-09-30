import type { AppRole } from "@ecom/validation";

export const permissions = {
  manageProducts: "catalog.products.manage",
  manageOrders: "orders.manage",
  moderateReviews: "reviews.moderate",
  manageInventory: "inventory.manage",
  readOrders: "orders.read",
  manageRoles: "roles.manage",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

export const allPermissions = Object.values(permissions);

/**
 * Staff grants. `admin` is expanded in `permissionsForRoles`, which is the
 * only place that implies every permission. Keep this map aligned with
 * `private.has_permission` in supabase/migrations.
 */
const staffGrants: Record<
  Exclude<AppRole, "admin" | "customer">,
  readonly Permission[]
> = {
  support: [permissions.readOrders, permissions.moderateReviews],
  catalog_manager: [permissions.manageProducts, permissions.manageInventory],
  order_manager: [permissions.manageOrders, permissions.readOrders],
};

export type Actor = {
  userId: string;
  email: string | null;
  emailConfirmed: boolean;
  roles: readonly AppRole[];
};

export function permissionsForRoles(
  roles: readonly AppRole[],
): ReadonlySet<Permission> {
  if (roles.includes("admin")) {
    return new Set(allPermissions);
  }

  const granted = new Set<Permission>();
  for (const role of roles) {
    if (role === "customer" || role === "admin") {
      continue;
    }
    for (const permission of staffGrants[role]) {
      granted.add(permission);
    }
  }
  return granted;
}

export function hasPermission(
  actor: Actor | null,
  permission: Permission,
): boolean {
  if (!actor) {
    return false;
  }
  return permissionsForRoles(actor.roles).has(permission);
}

export function canManageProducts(actor: Actor | null): boolean {
  return hasPermission(actor, permissions.manageProducts);
}

export function canManageOrders(actor: Actor | null): boolean {
  return hasPermission(actor, permissions.manageOrders);
}

export function canModerateReviews(actor: Actor | null): boolean {
  return hasPermission(actor, permissions.moderateReviews);
}

export function canManageInventory(actor: Actor | null): boolean {
  return hasPermission(actor, permissions.manageInventory);
}

export function canManageRoles(actor: Actor | null): boolean {
  return hasPermission(actor, permissions.manageRoles);
}

export function isStaff(actor: Actor | null): boolean {
  if (!actor) {
    return false;
  }
  return actor.roles.some((role) => role !== "customer");
}
