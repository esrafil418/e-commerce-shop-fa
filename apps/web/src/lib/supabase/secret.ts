import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireServerEnv } from "@/lib/env/server";
import { readSupabasePublicConfig } from "./config";

export function createSupabaseSecretClient() {
  const config = readSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL before using the secret client.",
    );
  }

  return createClient(config.url, requireServerEnv("SUPABASE_SECRET_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
