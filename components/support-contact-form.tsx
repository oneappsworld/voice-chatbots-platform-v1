"use client";

import { useState, type FormEvent } from "react";
import { submitSupportRequest } from "@/app/help/actions";

export function SupportContactForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await submitSupportRequest(subject, message);

    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSent(true);
    setSubject("");
    setMessage("");
  }

  if (sent) {
    return (
      <p className="auth-success">
        Message sent — we&apos;ll reply to your account email shortly.{" "}
        <button type="button" className="form-link" onClick={() => setSent(false)}>
          Send another
        </button>
      </p>
    );
  }

  return (
    <>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="subject">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            className="form-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="message">
            How can we help?
          </label>
          <textarea
            id="message"
            className="form-input"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={5000}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Sending…" : "Send message"}
        </button>
        <p className="form-hint">
          We reply to the email on your account. Prefer email directly? Write to{" "}
          <a href="mailto:support@chatsyn.io">support@chatsyn.io</a>.
        </p>
      </form>
    </>
  );
}
