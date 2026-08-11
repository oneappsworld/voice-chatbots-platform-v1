import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = {
  title: "Dashboard — Voice Chatbots Platform",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, created_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="dash-shell">
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
            Voice Chatbots Platform
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="dash-main">
        <div className="wrap">
          <div className="dash-card">
            <h1>Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}.</h1>
            <p>Your voice agent workspace is set up. This is a placeholder dashboard.</p>
            <div className="dash-meta">
              <div className="dash-meta-row">
                <span>Email</span>
                <span>{profile?.email ?? user.email}</span>
              </div>
              <div className="dash-meta-row">
                <span>User ID</span>
                <span>{user.id}</span>
              </div>
              <div className="dash-meta-row">
                <span>Profile created</span>
                <span>
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
