import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type OrgRole = "owner" | "admin" | "agent" | "viewer";

export type OrgContext = {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
  isAdmin: boolean;
};

/**
 * Non-throwing lookup used by the layout/nav to decide what to show.
 * Wrapped in React's per-request cache() because every protected page
 * renders <AppHeader>, which calls this too — without dedup, every admin
 * page load ran the same 3 queries twice (once from the header, once from
 * the page itself needing org name/role for its own content).
 *
 * Deliberately NOT in app/admin/actions.ts: that file has "use server" so
 * every export becomes a Server Action, and Server Actions don't appear to
 * share the same per-request cache() scope between two independent calls
 * (the header's call and the page's call) the way plain Server Component
 * data-fetching functions do — cache() had no measurable effect there.
 * This function is only ever called from Server Components, never from a
 * client action, so it doesn't need to be a Server Action at all.
 */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) return null;

  const [{ data: membership }, { data: org }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", profile.organization_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("organizations").select("name").eq("id", profile.organization_id).maybeSingle(),
  ]);

  if (!membership || membership.status !== "active") return null;

  const role = membership.role as OrgRole;
  return {
    organizationId: profile.organization_id as string,
    organizationName: org?.name ?? "Your organization",
    role,
    isAdmin: role === "owner" || role === "admin",
  };
});
