import { authCopy } from "./messages";
import {
  isStaff,
  permissionsForRoles,
  type Actor,
  type Permission,
} from "./permissions";

export type HttpResult = {
  status: 200 | 401 | 403;
  body:
    | {
        ok: true;
        data: Record<string, unknown>;
      }
    | {
        ok: false;
        error: { code: string; message: string };
      };
};

export function accountSessionResponse(actor: Actor | null): HttpResult {
  if (!actor) {
    return {
      status: 401,
      body: {
        ok: false,
        error: { code: "unauthenticated", message: authCopy.unauthenticated },
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      data: {
        userId: actor.userId,
        emailConfirmed: actor.emailConfirmed,
        roles: actor.roles,
      },
    },
  };
}

export function adminPermissionsResponse(actor: Actor | null): HttpResult {
  if (!actor) {
    return {
      status: 401,
      body: {
        ok: false,
        error: { code: "unauthenticated", message: authCopy.unauthenticated },
      },
    };
  }

  if (!isStaff(actor)) {
    return {
      status: 403,
      body: {
        ok: false,
        error: { code: "forbidden", message: authCopy.forbidden },
      },
    };
  }

  const granted: Permission[] = [...permissionsForRoles(actor.roles)];
  return {
    status: 200,
    body: {
      ok: true,
      data: { permissions: granted },
    },
  };
}
