"use server";

import { createClient } from "@/lib/supabase/server";
import { computeDashboardMetrics, type CallRow } from "@/lib/dashboard";
import type { Language } from "@/lib/nlu";
import type { VoiceStyle } from "@/lib/tts";
import type { EscalationSensitivity } from "@/lib/escalation";

export type OrgRole = "owner" | "admin" | "agent" | "viewer";

export type OrgContext = {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
  isAdmin: boolean;
};

/** Non-throwing lookup used by the layout/nav to decide what to show. */
export async function getOrgContext(): Promise<OrgContext | null> {
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
}

/** Throws unless the caller is an active owner/admin — every admin action below goes through this. */
async function requireOrgAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) throw new Error("No organization found.");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, status")
    .eq("organization_id", profile.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active" || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("Admin access required.");
  }

  return { supabase, user, organizationId: profile.organization_id as string, role: membership.role as OrgRole };
}

// ---------- Team / user management ----------

export type MemberRow = {
  id: string;
  invited_email: string;
  role: OrgRole;
  status: "invited" | "active";
  invited_at: string;
  joined_at: string | null;
};

export async function listMembers(): Promise<{ ok: true; members: MemberRow[] } | { ok: false; error: string }> {
  const { supabase, organizationId } = await requireOrgAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, invited_email, role, status, invited_at, joined_at")
    .eq("organization_id", organizationId)
    .order("invited_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, members: data as MemberRow[] };
}

export async function inviteMember(email: string, role: Exclude<OrgRole, "owner">) {
  const { supabase, organizationId } = await requireOrgAdmin();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  const { data: hasAccount } = await supabase.rpc("email_has_account", { check_email: trimmedEmail });
  if (hasAccount) {
    return {
      ok: false as const,
      error: "This email already has an account elsewhere — merging existing accounts isn't supported yet.",
    };
  }

  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    invited_email: trimmedEmail,
    role,
    status: "invited",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "This email has already been invited." };
    }
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function updateMemberRole(memberId: string, role: Exclude<OrgRole, "owner">) {
  const { supabase } = await requireOrgAdmin();
  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function removeMember(memberId: string) {
  const { supabase } = await requireOrgAdmin();
  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ---------- Global bot settings ----------

export type OrgSettings = {
  default_language: Language;
  default_voice_style: VoiceStyle;
  business_name: string | null;
  support_email: string | null;
  escalation_sensitivity: EscalationSensitivity;
};

export async function getOrgSettings(): Promise<{ ok: true; settings: OrgSettings } | { ok: false; error: string }> {
  const { supabase, organizationId } = await requireOrgAdmin();
  const { data, error } = await supabase
    .from("org_settings")
    .select("default_language, default_voice_style, business_name, support_email, escalation_sensitivity")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, settings: data as OrgSettings };
}

export async function updateOrgSettings(payload: OrgSettings) {
  const { supabase, organizationId } = await requireOrgAdmin();
  const { error } = await supabase
    .from("org_settings")
    .update({
      default_language: payload.default_language,
      default_voice_style: payload.default_voice_style,
      business_name: payload.business_name?.trim() || null,
      support_email: payload.support_email?.trim() || null,
      escalation_sensitivity: payload.escalation_sensitivity,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ---------- Content moderation (bot responses) ----------

export type BotResponseOverride = { language: Language; intent: string; response_text: string; updated_at: string };

export async function listBotResponseOverrides(): Promise<
  { ok: true; overrides: BotResponseOverride[] } | { ok: false; error: string }
> {
  const { supabase, organizationId } = await requireOrgAdmin();
  const { data, error } = await supabase
    .from("bot_responses")
    .select("language, intent, response_text, updated_at")
    .eq("organization_id", organizationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, overrides: data as BotResponseOverride[] };
}

export async function upsertBotResponse(language: Language, intent: string, responseText: string) {
  const { supabase, organizationId, user } = await requireOrgAdmin();
  const trimmed = responseText.trim();
  if (!trimmed) return { ok: false as const, error: "Response can't be empty." };

  const { error } = await supabase.from("bot_responses").upsert(
    {
      organization_id: organizationId,
      language,
      intent,
      response_text: trimmed,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,language,intent" }
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function resetBotResponse(language: Language, intent: string) {
  const { supabase, organizationId } = await requireOrgAdmin();
  const { error } = await supabase
    .from("bot_responses")
    .delete()
    .eq("organization_id", organizationId)
    .eq("language", language)
    .eq("intent", intent);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ---------- Aggregated analytics ----------

export type OrgAnalytics = {
  memberCount: number;
  call: ReturnType<typeof computeDashboardMetrics>;
  leads: {
    total: number;
    byQualification: { qualified: number; nurture: number; disqualified: number };
    avgScore: number;
  };
  appointments: {
    total: number;
    byStatus: { booked: number; cancelled: number };
    upcoming: number;
  };
  handoffs: {
    total: number;
    byReason: Record<string, number>;
    recent: { source_bot: string; reason: string; assigned_agent: string; created_at: string }[];
  };
};

export async function getOrgAnalytics(rangeDays: number): Promise<{ ok: true; analytics: OrgAnalytics } | { ok: false; error: string }> {
  const { supabase } = await requireOrgAdmin();

  // computeDashboardMetrics needs the requested range plus an equal prior
  // period for the vs-prior-period comparison — never all-time history.
  const rangeCutoff = new Date();
  rangeCutoff.setDate(rangeCutoff.getDate() - rangeDays * 2);

  // No .eq('user_id', ...) filter here on purpose — the additive "Org admins
  // can view all member X" RLS policies (see migration 20260812200000) let
  // an admin's plain select naturally return every active team member's
  // rows, not just their own. Same pattern used by every action below.
  // leads/appointments/handoffs stay unfiltered by date — the UI presents
  // them as all-time totals, not range-scoped like call volume.
  const [{ data: members }, { data: calls }, { data: leads }, { data: appointments }, { data: handoffs }] = await Promise.all([
    supabase.from("organization_members").select("id").eq("status", "active"),
    supabase
      .from("calls")
      .select("occurred_at, department, topic, outcome, duration_seconds")
      .gte("occurred_at", rangeCutoff.toISOString()),
    supabase.from("leads").select("qualification, score"),
    supabase.from("appointments").select("status, scheduled_at"),
    supabase.from("handoffs").select("source_bot, reason, assigned_agent, created_at").order("created_at", { ascending: false }),
  ]);

  const callMetrics = computeDashboardMetrics((calls ?? []) as CallRow[], rangeDays);

  const byQualification = { qualified: 0, nurture: 0, disqualified: 0 };
  let scoreSum = 0;
  for (const l of leads ?? []) {
    const q = l.qualification as keyof typeof byQualification;
    if (q in byQualification) byQualification[q] += 1;
    scoreSum += l.score ?? 0;
  }
  const avgScore = leads && leads.length ? Math.round((scoreSum / leads.length) * 10) / 10 : 0;

  const byStatus = { booked: 0, cancelled: 0 };
  let upcoming = 0;
  const now = Date.now();
  for (const a of appointments ?? []) {
    const s = a.status as keyof typeof byStatus;
    if (s in byStatus) byStatus[s] += 1;
    if (a.status === "booked" && new Date(a.scheduled_at).getTime() > now) upcoming += 1;
  }

  const byReason: Record<string, number> = {};
  for (const h of handoffs ?? []) {
    byReason[h.reason] = (byReason[h.reason] ?? 0) + 1;
  }

  return {
    ok: true,
    analytics: {
      memberCount: members?.length ?? 0,
      call: callMetrics,
      leads: { total: leads?.length ?? 0, byQualification, avgScore },
      appointments: { total: appointments?.length ?? 0, byStatus, upcoming },
      handoffs: { total: handoffs?.length ?? 0, byReason, recent: (handoffs ?? []).slice(0, 8) },
    },
  };
}
