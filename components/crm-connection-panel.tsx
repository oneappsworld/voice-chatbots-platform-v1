"use client";

import { useState, type FormEvent } from "react";
import { connectZendesk, disconnectZendesk, lookupCustomer } from "@/app/settings/actions";
import type { ZendeskCustomerLookup } from "@/lib/zendesk";

type ConnectionState = {
  status: "disconnected" | "connected" | "error";
  subdomain: string | null;
  agentEmail: string | null;
  connectedAgentName: string | null;
  lastError: string | null;
};

export function CrmConnectionPanel({ initial }: { initial: ConnectionState }) {
  const [state, setState] = useState(initial);
  const [subdomain, setSubdomain] = useState(initial.subdomain ?? "");
  const [agentEmail, setAgentEmail] = useState(initial.agentEmail ?? "");
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [lookupEmail, setLookupEmail] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<ZendeskCustomerLookup | null>(null);

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setFormError(null);
    const res = await connectZendesk({ subdomain, agentEmail, apiToken });
    setConnecting(false);
    if (res.ok) {
      setState({
        status: "connected",
        subdomain,
        agentEmail,
        connectedAgentName: res.agentName,
        lastError: null,
      });
      setApiToken("");
    } else {
      setFormError(res.error);
      setState((s) => ({ ...s, status: "error", lastError: res.error }));
    }
  }

  async function handleDisconnect() {
    await disconnectZendesk();
    setState({ status: "disconnected", subdomain: null, agentEmail: null, connectedAgentName: null, lastError: null });
    setSubdomain("");
    setAgentEmail("");
    setLookupResult(null);
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setLookingUp(true);
    setLookupError(null);
    setLookupResult(null);
    const res = await lookupCustomer(lookupEmail);
    setLookingUp(false);
    if (res.ok) {
      setLookupResult(res.result);
    } else {
      setLookupError(res.error);
    }
  }

  if (state.status === "connected") {
    return (
      <div>
        <div className="crm-status crm-status-connected">
          <span className="crm-status-dot" />
          Connected as <strong>{state.connectedAgentName}</strong> on{" "}
          <strong>{state.subdomain}.zendesk.com</strong>
          <button type="button" className="crm-disconnect" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>

        <div className="crm-lookup">
          <div className="panel-title" style={{ fontSize: "0.96rem", marginBottom: 4 }}>
            Try a live lookup
          </div>
          <p className="panel-subtitle" style={{ marginBottom: 14 }}>
            This is the same lookup your voice agent runs mid-call to pull customer context.
          </p>
          <form onSubmit={handleLookup} className="crm-lookup-form">
            <input
              type="email"
              className="form-input"
              placeholder="customer@example.com"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={lookingUp}>
              {lookingUp ? "Looking up…" : "Look up"}
            </button>
          </form>

          {lookupError && <p className="auth-error" style={{ marginTop: 14 }}>{lookupError}</p>}

          {lookupResult && (
            <div className="crm-result">
              {lookupResult.found ? (
                <>
                  <div className="crm-result-name">{lookupResult.name}</div>
                  <div className="crm-result-row">
                    <span>Email</span>
                    <span>{lookupResult.email}</span>
                  </div>
                  <div className="crm-result-row">
                    <span>Phone</span>
                    <span>{lookupResult.phone ?? "—"}</span>
                  </div>
                  <div className="crm-result-row">
                    <span>Organization</span>
                    <span>{lookupResult.organization ?? "—"}</span>
                  </div>
                  <div className="crm-result-row">
                    <span>Open tickets</span>
                    <span>{lookupResult.openTicketCount}</span>
                  </div>
                  {lookupResult.recentTickets && lookupResult.recentTickets.length > 0 && (
                    <ul className="crm-tickets">
                      {lookupResult.recentTickets.map((t) => (
                        <li key={t.id}>
                          #{t.id} · {t.subject} <span className="crm-ticket-status">{t.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="panel-subtitle">No Zendesk user found for that email.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {state.status === "error" && (
        <p className="auth-error">Last attempt failed: {state.lastError}</p>
      )}
      <form onSubmit={handleConnect}>
        <div className="form-group">
          <label className="form-label" htmlFor="subdomain">
            Zendesk subdomain
          </label>
          <input
            id="subdomain"
            type="text"
            className="form-input"
            placeholder="yourcompany"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="agentEmail">
            Agent email
          </label>
          <input
            id="agentEmail"
            type="email"
            className="form-input"
            placeholder="agent@yourcompany.com"
            value={agentEmail}
            onChange={(e) => setAgentEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="apiToken">
            API token
          </label>
          <input
            id="apiToken"
            type="password"
            className="form-input"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            required
          />
          <p className="form-hint">
            Zendesk Admin Center → Apps and integrations → APIs → Zendesk API → enable token
            access, then generate a new token.
          </p>
        </div>
        {formError && <p className="auth-error">{formError}</p>}
        <button type="submit" className="btn btn-primary" disabled={connecting}>
          {connecting ? "Connecting…" : "Connect Zendesk"}
        </button>
      </form>
    </div>
  );
}
