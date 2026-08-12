"use client";

import { useState } from "react";
import { inviteMember, removeMember, updateMemberRole, type MemberRow, type OrgRole } from "@/app/admin/actions";

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  agent: "Agent",
  viewer: "Viewer",
};

const INVITABLE_ROLES: Exclude<OrgRole, "owner">[] = ["admin", "agent", "viewer"];

export function TeamManagementPanel({
  initialMembers,
  currentRole,
}: {
  initialMembers: MemberRow[];
  currentRole: OrgRole;
}) {
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<OrgRole, "owner">>("agent");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleInvite() {
    setError(null);
    setInviting(true);
    try {
      const res = await inviteMember(email, role);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMembers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          invited_email: email.trim().toLowerCase(),
          role,
          status: "invited",
          invited_at: new Date().toISOString(),
          joined_at: null,
        },
      ]);
      setEmail("");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(member: MemberRow, newRole: Exclude<OrgRole, "owner">) {
    setBusyId(member.id);
    setError(null);
    try {
      const res = await updateMemberRole(member.id, newRole);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(member: MemberRow) {
    setBusyId(member.id);
    setError(null);
    try {
      const res = await removeMember(member.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Invite a teammate</label>
        <div className="crm-lookup-form">
          <input
            type="email"
            className="form-input"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleInvite();
              }
            }}
          />
          <select
            className="form-input"
            style={{ maxWidth: 140 }}
            value={role}
            onChange={(e) => setRole(e.target.value as Exclude<OrgRole, "owner">)}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleInvite} disabled={inviting || !email.trim()}>
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </div>
        {error && <p className="auth-error" style={{ marginTop: 10 }}>{error}</p>}
      </div>

      <div className="chat-log" style={{ maxHeight: "none" }}>
        {members.length === 0 && <p className="form-hint">No team members yet.</p>}
        {members.map((member) => {
          const isOwner = member.role === "owner";
          const canManage = currentRole === "owner" || currentRole === "admin";
          return (
            <div key={member.id} className="crm-result" style={{ marginTop: 0 }}>
              <div className="crm-result-row" style={{ borderTop: "none" }}>
                <span className="crm-result-name" style={{ marginBottom: 0 }}>
                  {member.invited_email}
                </span>
                <span className={`intent-badge intent-badge-sm ${member.status === "active" ? "intent-conversational" : "intent-generic"}`}>
                  {member.status === "active" ? "Active" : "Invited"}
                </span>
              </div>
              <div className="crm-result-row">
                <span>Role</span>
                <span>
                  {isOwner || !canManage ? (
                    ROLE_LABELS[member.role]
                  ) : (
                    <select
                      className="form-input"
                      style={{ display: "inline-block", width: "auto", padding: "4px 8px" }}
                      value={member.role}
                      disabled={busyId === member.id}
                      onChange={(e) => handleRoleChange(member, e.target.value as Exclude<OrgRole, "owner">)}
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
              </div>
              <div className="crm-result-row">
                <span>{member.status === "active" ? "Joined" : "Invited"}</span>
                <span>{new Date(member.joined_at ?? member.invited_at).toLocaleDateString()}</span>
              </div>
              {!isOwner && canManage && (
                <div className="escalate-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="escalate-link"
                    disabled={busyId === member.id}
                    onClick={() => handleRemove(member)}
                  >
                    Remove from team
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
