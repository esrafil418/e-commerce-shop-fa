import { readPublicEnv } from "@/lib/env/public";

export function readSupabasePublicConfig():
  | { url: string; publishableKey: string }
  | null {
  const env = readPublicEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();
  if (!url || !publishableKey) {
    return null;
  }
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabasePublicConfig() !== null;
}
