"use client";

import { useId, useState } from "react";

export function PasswordInput({
  id,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const describedById = useId();

  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-describedby={describedById}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.4 10.4 0 0112 5c5 0 9 4 10 7-.4 1.2-1.1 2.4-2 3.4M6.2 6.7C4 8.2 2.4 10.3 2 12c.7 2.5 2.4 4.6 4.7 6.1A10.4 10.4 0 0012 19c1.2 0 2.3-.2 3.3-.6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <path
              d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </button>
      <span id={describedById} className="sr-only">
        {visible ? "Password is visible" : "Password is hidden"}
      </span>
    </div>
  );
}
