import type { ZodType } from "zod";
import {
  checkoutIntentSchema,
  grantRoleSchema,
  profileUpdateSchema,
  revokeRoleSchema,
  type CheckoutIntentInput,
  type GrantRoleInput,
  type ProfileUpdateInput,
} from "@ecom/validation";
import { err, ok, type Result } from "@/types/result";
import { authCopy } from "./messages";
import {
  canManageRoles,
  isStaff,
  type Actor,
} from "./permissions";
import { sanitizeRedirectPath } from "./redirect";

const moneyKeys = [
  "price",
  "total",
  "totalRial",
  "discount",
  "shippingPrice",
] as const;

const roleKeys = ["role", "roles"] as const;

export type AccessDecision =
  | { kind: "allow"; actor: Actor }
  | { kind: "redirect"; location: string }
  | { kind: "forbidden" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireActor(actor: Actor | null): Result<Actor> {
  if (!actor) {
    return err("unauthenticated", authCopy.unauthenticated);
  }
  return ok(actor);
}

export function requireVerifiedEmail(actor: Actor | null): Result<Actor> {
  const authenticated = requireActor(actor);
  if (!authenticated.ok) {
    return authenticated;
  }
  if (!authenticated.data.emailConfirmed) {
    return err("email_unverified", authCopy.emailUnverified);
  }
  return authenticated;
}

export function parseTrusted<T>(
  schema: ZodType<T>,
  raw: unknown,
): Result<T> {
  if (isRecord(raw)) {
    for (const key of moneyKeys) {
      if (key in raw && raw[key] != null && raw[key] !== "") {
        return err("untrusted_input", authCopy.untrustedMoney);
      }
    }
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err("invalid_input", issue?.message ?? authCopy.authFailed);
  }
  return ok(parsed.data);
}

export function registrationMetadata(input: {
  fullName: string;
}): { full_name?: string } {
  const fullName = input.fullName.trim();
  if (!fullName) {
    return {};
  }
  return { full_name: fullName };
}

export function resolveOwnUserId(
  actor: Actor,
  requestedUserId: unknown,
): Result<string> {
  if (
    typeof requestedUserId === "string" &&
    requestedUserId.length > 0 &&
    requestedUserId !== actor.userId
  ) {
    return err("forbidden", authCopy.forbidden);
  }
  return ok(actor.userId);
}

export function decideProfileUpdate(
  actor: Actor | null,
  raw: unknown,
): Result<ProfileUpdateInput & { userId: string }> {
  const authenticated = requireActor(actor);
  if (!authenticated.ok) {
    return authenticated;
  }

  if (isRecord(raw)) {
    for (const key of roleKeys) {
      if (key in raw) {
        return err("forbidden", authCopy.roleNotAssignable);
      }
    }
  }

  const owner = resolveOwnUserId(
    authenticated.data,
    isRecord(raw) ? raw.userId : undefined,
  );
  if (!owner.ok) {
    return owner;
  }

  const parsed = parseTrusted(profileUpdateSchema, omitKeys(raw, ["userId"]));
  if (!parsed.ok) {
    return parsed;
  }

  return ok({ ...parsed.data, userId: owner.data });
}

export function decideGrantRole(
  actor: Actor | null,
  raw: unknown,
): Result<GrantRoleInput> {
  const authenticated = requireActor(actor);
  if (!authenticated.ok) {
    return authenticated;
  }
  if (!canManageRoles(authenticated.data)) {
    return err("forbidden", authCopy.forbidden);
  }
  return parseTrusted(grantRoleSchema, raw);
}

export function decideRevokeRole(
  actor: Actor | null,
  raw: unknown,
): Result<GrantRoleInput> {
  const authenticated = requireActor(actor);
  if (!authenticated.ok) {
    return authenticated;
  }
  if (!canManageRoles(authenticated.data)) {
    return err("forbidden", authCopy.forbidden);
  }
  return parseTrusted(revokeRoleSchema, raw);
}

export function decideCheckoutIntent(
  actor: Actor | null,
  raw: unknown,
): Result<CheckoutIntentInput> {
  const verified = requireVerifiedEmail(actor);
  if (!verified.ok) {
    return verified;
  }
  if (isRecord(raw) && "userId" in raw) {
    return err("forbidden", authCopy.forbidden);
  }
  return parseTrusted(checkoutIntentSchema, raw);
}

export function decideAccountAccess(
  actor: Actor | null,
  nextPath: string,
): AccessDecision {
  if (!actor) {
    const next = sanitizeRedirectPath(nextPath, "/account");
    return {
      kind: "redirect",
      location: `/auth/login?next=${encodeURIComponent(next)}`,
    };
  }
  return { kind: "allow", actor };
}

export function decideAdminAccess(actor: Actor | null): AccessDecision {
  if (!actor) {
    return {
      kind: "redirect",
      location: "/auth/login?next=%2Fadmin",
    };
  }
  if (!isStaff(actor)) {
    return { kind: "forbidden" };
  }
  return { kind: "allow", actor };
}

export function decideAdminSection(
  actor: Actor | null,
  allowed: boolean,
): AccessDecision {
  const admin = decideAdminAccess(actor);
  if (admin.kind !== "allow") {
    return admin;
  }
  if (!allowed) {
    return { kind: "forbidden" };
  }
  return admin;
}

function omitKeys(raw: unknown, keys: readonly string[]): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const copy: Record<string, unknown> = { ...raw };
  for (const key of keys) {
    delete copy[key];
  }
  return copy;
}
