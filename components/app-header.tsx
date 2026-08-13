import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { getOrgContext } from "@/lib/org-context";

export async function AppHeader({
  active,
}: {
  active: "dashboard" | "settings" | "voice-test" | "bots" | "admin";
}) {
  const org = await getOrgContext();

  return (
    <header className="dash-header">
      <div className="wrap">
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
        <nav className="app-nav">
          <Link href="/dashboard" className={active === "dashboard" ? "active" : ""}>
            Dashboard
          </Link>
          <Link href="/settings" className={active === "settings" ? "active" : ""}>
            Settings
          </Link>
          <Link href="/voice-test" className={active === "voice-test" ? "active" : ""}>
            Voice Test
          </Link>
          <Link href="/bots" className={active === "bots" ? "active" : ""}>
            Bots
          </Link>
          {org?.isAdmin && (
            <Link href="/admin" className={active === "admin" ? "active" : ""}>
              Admin
            </Link>
          )}
        </nav>
        <LogoutButton />
      </div>
    </header>
  );
}
