import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A brand-new OAuth account has created_at == last_sign_in_at (within a
      // couple seconds of each other); a returning user's last_sign_in_at is
      // far later. Only tag the default (non-password-reset) redirect target
      // so this doesn't interfere with the password-reset code-exchange path,
      // which also runs through this same route.
      const user = data.user;
      const isNewSignUp =
        next === "/dashboard" &&
        user &&
        Math.abs(new Date(user.last_sign_in_at ?? 0).getTime() - new Date(user.created_at).getTime()) < 5000;
      const redirectTo = isNewSignUp ? `${next}?new_signup=1` : next;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
