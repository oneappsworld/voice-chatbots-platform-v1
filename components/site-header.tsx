import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header>
      <nav className="wrap">
        <Link href="/" className="logo">
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
        </Link>
        <div className="nav-links">
          <Link href="/#features">Features</Link>
          <Link href="/#testimonials">Customers</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/#faq">FAQ</Link>
        </div>
        <div className="nav-cta">
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost btn-sm">
                Dashboard
              </Link>
              <LogoutButton className="btn btn-primary btn-sm" />
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log In
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
