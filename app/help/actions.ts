"use server";

import { createClient } from "@/lib/supabase/server";
import { isResendConfigured, sendSupportEmail } from "@/lib/resend";
import { validateSupportRequest } from "@/lib/support-request";

export async function submitSupportRequest(
  subject: string,
  message: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Name/email come from the account's own profile, never from client input
  // — this form emails on the user's behalf, so the sender identity has to
  // be the one the session actually authenticated, not whatever a request
  // body claims.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const fromEmail = profile?.email ?? user.email;
  if (!fromEmail) return { error: "No account email on file." };

  const input = { name: profile?.full_name ?? "", fromEmail, subject, message };
  const validationError = validateSupportRequest(input);
  if (validationError) return { error: validationError };

  if (!isResendConfigured()) {
    return { error: "Support email isn't configured yet — please email support@chatsyn.io directly." };
  }

  const result = await sendSupportEmail(input);
  if (!result.ok) return { error: result.error };
  return { ok: true };
}
