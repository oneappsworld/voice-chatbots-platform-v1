import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Sign Up — Voice Chatbots Platform",
};

export default function SignupPage() {
  return (
    <div className="auth-shell">
      <div className="glow" />
      <Link href="/" className="back-home">
        ← Back to home
      </Link>
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
          Voice Chatbots Platform
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">
          Start your 14-day free trial. No credit card required.
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
