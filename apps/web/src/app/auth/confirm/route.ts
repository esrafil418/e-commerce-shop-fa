import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { sanitizeRedirectPath } from "@/features/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && otpTypes.has(value as EmailOtpType);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const fallback = type === "recovery" ? "/auth/update-password" : "/account";
  const next = sanitizeRedirectPath(url.searchParams.get("next"), fallback);
  const login = new URL("/auth/login", url.origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(login);
  }

  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(login);
    }
  } else if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(login);
    }
  } else {
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
