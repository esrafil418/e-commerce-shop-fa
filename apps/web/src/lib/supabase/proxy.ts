import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeRedirectPath } from "@/features/auth/redirect";
import {
  createRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";
import { readSupabasePublicConfig } from "./config";

const cacheHeaders = ["cache-control", "expires", "pragma"] as const;

export function requiresSession(pathname: string): boolean {
  return (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function copySession(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  for (const header of cacheHeaders) {
    const value = source.headers.get(header);
    if (value) {
      target.headers.set(header, value);
    }
  }
}

export async function refreshSession(request: NextRequest) {
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? createRequestId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId);

  const config = readSupabasePublicConfig();
  let authenticated = false;

  if (config) {
    const supabase = createServerClient(config.url, config.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
          if (headers) {
            for (const [key, value] of Object.entries(headers)) {
              supabaseResponse.headers.set(key, value);
            }
          }
          supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId);
        },
      },
    });

    try {
      const { data, error } = await supabase.auth.getClaims();
      const subject = data?.claims?.sub;
      authenticated = !error && typeof subject === "string" && subject.length > 0;
    } catch {
      authenticated = false;
    }
  }

  if (requiresSession(request.nextUrl.pathname) && !authenticated) {
    const url = request.nextUrl.clone();
    const next = sanitizeRedirectPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      "/account",
    );
    url.pathname = "/auth/login";
    url.search = "";
    url.searchParams.set("next", next);
    const redirectResponse = NextResponse.redirect(url);
    copySession(redirectResponse, supabaseResponse);
    redirectResponse.headers.set(REQUEST_ID_HEADER, requestId);
    return redirectResponse;
  }

  return supabaseResponse;
}
