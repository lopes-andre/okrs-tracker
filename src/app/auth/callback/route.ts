import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Validate redirect path to prevent open redirect attacks.
 * Only allows relative paths starting with / and no protocol.
 */
function getSafeRedirectPath(next: string | null): string {
  const defaultPath = "/plans";

  if (!next) return defaultPath;

  // Must start with single / (not // which would be protocol-relative)
  if (!next.startsWith("/") || next.startsWith("//")) {
    return defaultPath;
  }

  // Block dangerous protocols that could be encoded
  const lowercaseNext = next.toLowerCase();
  if (
    lowercaseNext.includes("javascript:") ||
    lowercaseNext.includes("data:") ||
    lowercaseNext.includes("vbscript:")
  ) {
    return defaultPath;
  }

  // Only allow paths under /plans for extra safety
  if (!next.startsWith("/plans")) {
    return defaultPath;
  }

  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
