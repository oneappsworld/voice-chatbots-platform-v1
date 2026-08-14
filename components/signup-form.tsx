"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { PasswordInput } from "@/components/password-input";
import { trackSignUp } from "@/lib/analytics";
import type { Plan } from "@/lib/plan-limits";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan: Plan = searchParams.get("plan") === "pro" ? "pro" : "starter";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, selected_plan: selectedPlan },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      trackSignUp("email");
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // No session back means email confirmation is required after all.
    trackSignUp("email");
    setError(null);
    setLoading(false);
    router.push("/login?confirmEmail=1");
  }

  return (
    <>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            className="form-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Work email
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
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} required />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Creating account…" : "Create My Account"}
        </button>
      </form>
      <div className="auth-divider">or</div>
      <GoogleAuthButton />
      <p className="auth-footer">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}
