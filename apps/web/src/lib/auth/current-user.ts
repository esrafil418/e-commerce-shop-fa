import "server-only";

import { cookies } from "next/headers";
import type { AppRole } from "@ecom/validation";
import { appRoles } from "@ecom/validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Actor } from "@/features/auth/permissions";

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (appRoles as readonly string[]).includes(value);
}

export async function getCurrentActor(): Promise<Actor | null> {
  await cookies();
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  const roles: AppRole[] = [];
  if (!roleError && Array.isArray(roleRows)) {
    for (const row of roleRows) {
      if (row && typeof row === "object" && "role" in row && isAppRole(row.role)) {
        roles.push(row.role);
      }
    }
  }

  const confirmedAt =
    "email_confirmed_at" in data.user ? data.user.email_confirmed_at : null;

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    emailConfirmed: Boolean(confirmedAt),
    roles,
  };
}

export type ProfileRecord = {
  fullName: string;
  phone: string;
};

export async function getOwnProfile(actor: Actor): Promise<ProfileRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", actor.userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as { full_name?: string | null; phone?: string | null };
  return {
    fullName: row.full_name ?? "",
    phone: row.phone ?? "",
  };
}
