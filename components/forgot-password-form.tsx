"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="auth-success">
        If an account exists for {email}, a password reset link is on its way.
      </p>
    );
  }

  return (
    <>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>
      <p className="auth-footer">
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}
