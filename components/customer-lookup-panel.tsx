"use client";

import { useState } from "react";
import { listCustomers, getCustomerHistory, type CustomerRow, type CustomerHistory } from "@/app/admin/actions";

const QUALIFICATION_LABEL: Record<string, string> = {
  qualified: "Qualified",
  nurture: "Nurture",
  disqualified: "Disqualified",
};

export function CustomerLookupPanel({ initialCustomers }: { initialCustomers: CustomerRow[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function runSearch(query: string) {
    setSearching(true);
    const res = await listCustomers(query);
    setSearching(false);
    if (res.ok) setCustomers(res.customers);
  }

  async function toggleExpand(customer: CustomerRow) {
    if (expandedId === customer.id) {
      setExpandedId(null);
      setHistory(null);
      return;
    }
    setExpandedId(customer.id);
    setHistory(null);
    setLoadingHistory(true);
    const res = await getCustomerHistory(customer.id);
    setLoadingHistory(false);
    if (res.ok) setHistory(res.history);
  }

  return (
    <div>
      <div className="form-group">
        <div className="crm-lookup-form">
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch(search);
              }
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => runSearch(search)} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {customers.length === 0 && <p className="form-hint">No customers recorded yet.</p>}

      <div className="chat-log" style={{ maxHeight: "none" }}>
        {customers.map((customer) => (
          <div key={customer.id} className="crm-result" style={{ marginTop: 0 }}>
            <div
              className="crm-result-row"
              style={{ borderTop: "none", cursor: "pointer" }}
              onClick={() => toggleExpand(customer)}
            >
              <span className="crm-result-name" style={{ marginBottom: 0 }}>
                {customer.name ?? customer.email ?? customer.phone ?? "Unknown"}
              </span>
              <span className="form-hint" style={{ margin: 0 }}>
                Last seen {new Date(customer.last_seen_at).toLocaleDateString()}
              </span>
            </div>
            <div className="crm-result-row">
              <span>Email</span>
              <span>{customer.email ?? "—"}</span>
            </div>
            <div className="crm-result-row">
              <span>Phone</span>
              <span>{customer.phone ?? "—"}</span>
            </div>

            {expandedId === customer.id && (
              <div style={{ marginTop: 10 }}>
                {loadingHistory && <p className="form-hint">Loading history…</p>}
                {history && (
                  <>
                    {history.leads.length === 0 && history.appointments.length === 0 && (
                      <p className="form-hint">No lead or appointment history for this customer.</p>
                    )}
                    {history.leads.length > 0 && (
                      <ul className="crm-tickets">
                        {history.leads.map((l) => (
                          <li key={l.id}>
                            Lead · {l.company ?? "No company given"}{" "}
                            <span className="crm-ticket-status">
                              {QUALIFICATION_LABEL[l.qualification] ?? l.qualification} · {l.score}/11
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {history.appointments.length > 0 && (
                      <ul className="crm-tickets">
                        {history.appointments.map((a) => (
                          <li key={a.id}>
                            Appointment · {a.service} on {new Date(a.scheduled_at).toLocaleDateString()}{" "}
                            <span className="crm-ticket-status">{a.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
