"use client";

import { useState, type FormEvent } from "react";
import { disconnectZendesk, lookupCustomer } from "@/app/settings/actions";
import type { ZendeskCustomerLookup } from "@/lib/zendesk";

type ConnectionState = {
  status: "disconnected" | "connected" | "error";
  subdomain: string | null;
  connectedAgentName: string | null;
  lastError: string | null;
};

export function CrmConnectionPanel({
  initial,
  callbackError,
  justConnected,
}: {
  initial: ConnectionState;
  callbackError: string | null;
  justConnected: boolean;
}) {
  const [state, setState] = useState(initial);
  const [subdomain, setSubdomain] = useState(initial.subdomain ?? "");

  const [lookupEmail, setLookupEmail] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<ZendeskCustomerLookup | null>(null);

  async function handleDisconnect() {
    await disconnectZendesk();
    setState({ status: "disconnected", subdomain: null, connectedAgentName: null, lastError: null });
    setSubdomain("");
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
        {justConnected && (
          <p className="crm-status crm-status-connected" style={{ marginBottom: 14 }}>
            Zendesk connected successfully.
          </p>
        )}
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
      {callbackError && <p className="auth-error">{callbackError}</p>}

      <form action="/api/zendesk/oauth/start" method="GET">
        <div className="form-group">
          <label className="form-label" htmlFor="subdomain">
            Zendesk subdomain
          </label>
          <input
            id="subdomain"
            name="subdomain"
            type="text"
            className="form-input"
            placeholder="yourcompany"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            required
          />
          <p className="form-hint">
            The part before .zendesk.com in your Zendesk URL — e.g. yourcompany.zendesk.com.
          </p>
        </div>
        <button type="submit" className="btn btn-primary">
          Connect with Zendesk
        </button>
      </form>
    </div>
  );
}
