"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-google btn-block"
        onClick={handleClick}
        disabled={loading}
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.83z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.12A12 12 0 0012 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.27a7.2 7.2 0 010-4.54V6.61H1.26a12 12 0 000 10.78l4.01-3.12z"
          />
          <path
            fill="#EA4335"
            d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.12C6.22 6.88 8.87 4.77 12 4.77z"
          />
        </svg>
        {loading ? "Connecting…" : "Continue with Google"}
      </button>
      {error && <p className="auth-error" style={{ marginTop: 14 }}>{error}</p>}
    </div>
  );
}
