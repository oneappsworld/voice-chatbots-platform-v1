"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            className="form-input"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </>
  );
}
