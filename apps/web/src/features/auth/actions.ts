"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  registerSchema,
} from "@ecom/validation";
import { clientIp } from "@/lib/http/client-ip";
import { readPublicEnv } from "@/lib/env/public";
import { logServer } from "@/server/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { authRateLimits } from "@/lib/rate-limit/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSessionActor } from "@/lib/auth/session";
import {
  decideGrantRole,
  decideProfileUpdate,
  decideRevokeRole,
  registrationMetadata,
} from "./access";
import { authCopy } from "./messages";
import { sanitizeRedirectPath } from "./redirect";
import type { AuthFormState } from "./form-state";

function failure(message: string): AuthFormState {
  return { status: "error", message, fieldErrors: {} };
}

function fieldFailure(
  fieldErrors: AuthFormState["fieldErrors"],
): AuthFormState {
  return { status: "error", message: null, fieldErrors };
}

function readForm(formData: FormData): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      record[key] = value;
    }
  }
  return record;
}

async function throttle(
  kind: keyof typeof authRateLimits,
): Promise<AuthFormState | null> {
  const headerList = await headers();
  const policy = authRateLimits[kind];
  const decision = await createRateLimiter().consume({
    key: `${kind}:${clientIp(headerList)}`,
    limit: policy.limit,
    windowMs: policy.windowMs,
  });
  if (!decision.allowed) {
    return failure(authCopy.rateLimited);
  }
  return null;
}

function confirmUrl(nextPath: string): string {
  const site = readPublicEnv().NEXT_PUBLIC_SITE_URL;
  const next = sanitizeRedirectPath(nextPath, "/account");
  return `${site}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function registerAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limited = await throttle("register");
  if (limited) {
    return limited;
  }
  if (!isSupabaseConfigured()) {
    return failure(authCopy.notConfigured);
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return fieldFailure(fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: confirmUrl("/account"),
      data: registrationMetadata({ fullName: parsed.data.fullName }),
    },
  });

  if (error) {
    await logServer("warn", "auth.register_failed");
    return failure(authCopy.authFailed);
  }

  if (data.session) {
    redirect("/account");
  }

  return {
    status: "success",
    message: authCopy.checkEmail,
    fieldErrors: {},
  };
}

export async function loginAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limited = await throttle("login");
  if (limited) {
    return limited;
  }
  if (!isSupabaseConfigured()) {
    return failure(authCopy.notConfigured);
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return fieldFailure(fieldErrors);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    await logServer("warn", "auth.login_failed");
    return failure(authCopy.invalidCredentials);
  }

  const next = sanitizeRedirectPath(String(formData.get("next") ?? ""), "/account");
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordResetAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limited = await throttle("recover");
  if (limited) {
    return limited;
  }

  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return fieldFailure({ email: parsed.error.issues[0]?.message });
  }
  if (!isSupabaseConfigured()) {
    return failure(authCopy.notConfigured);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl("/auth/update-password"),
  });
  if (error) {
    await logServer("warn", "auth.recover_failed");
  }

  return {
    status: "success",
    message: authCopy.resetSent,
    fieldErrors: {},
  };
}

export async function updatePasswordAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSessionActor();
  if (!session.ok) {
    return failure(authCopy.recoveryRequired);
  }

  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fieldFailure({ password: parsed.error.issues[0]?.message });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    await logServer("warn", "auth.password_update_failed");
    return failure(authCopy.authFailed);
  }

  return {
    status: "success",
    message: authCopy.passwordUpdated,
    fieldErrors: {},
  };
}

export async function updateProfileAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSessionActor();
  if (!session.ok) {
    return failure(session.error.message);
  }

  const decision = decideProfileUpdate(session.data, readForm(formData));
  if (!decision.ok) {
    return failure(decision.error.message);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: decision.data.fullName,
      phone: decision.data.phone,
    })
    .eq("id", decision.data.userId);

  if (error) {
    await logServer("warn", "auth.profile_update_failed");
    return failure(authCopy.authFailed);
  }

  return {
    status: "success",
    message: authCopy.profileSaved,
    fieldErrors: {},
  };
}

export async function grantRoleAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSessionActor();
  if (!session.ok) {
    return failure(session.error.message);
  }

  const decision = decideGrantRole(session.data, readForm(formData));
  if (!decision.ok) {
    return failure(decision.error.message);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("grant_role", {
    target_user_id: decision.data.userId,
    target_role: decision.data.role,
  });
  if (error) {
    await logServer("warn", "auth.grant_role_failed");
    return failure(authCopy.forbidden);
  }

  return {
    status: "success",
    message: authCopy.roleGranted,
    fieldErrors: {},
  };
}

export async function revokeRoleAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await requireSessionActor();
  if (!session.ok) {
    return failure(session.error.message);
  }

  const decision = decideRevokeRole(session.data, readForm(formData));
  if (!decision.ok) {
    return failure(decision.error.message);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revoke_role", {
    target_user_id: decision.data.userId,
    target_role: decision.data.role,
  });
  if (error) {
    await logServer("warn", "auth.revoke_role_failed");
    return failure(authCopy.forbidden);
  }

  return {
    status: "success",
    message: authCopy.roleRevoked,
    fieldErrors: {},
  };
}
