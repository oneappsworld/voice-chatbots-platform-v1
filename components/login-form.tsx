"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { PasswordInput } from "@/components/password-input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmEmail = searchParams.get("confirmEmail") === "1";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      {confirmEmail && (
        <p className="auth-success">
          Account created. Please check your email to confirm, then log in.
        </p>
      )}
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
        <div className="form-group">
          <div className="form-row-between">
            <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
              Password
            </label>
            <Link href="/forgot-password" className="form-link">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>
      <div className="auth-divider">or</div>
      <GoogleAuthButton />
      <p className="auth-footer">
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </>
  );
}
