import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata: Metadata = {
  title: "Set New Password — ChatSyn",
};

export default function UpdatePasswordPage() {
  return (
    <div className="auth-shell">
      <div className="glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
                stroke="#0b0c14"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M19 11v1a7 7 0 01-14 0v-1M12 19v3"
                stroke="#0b0c14"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          ChatSyn
        </div>
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-subtitle">Choose a new password for your account.</p>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
