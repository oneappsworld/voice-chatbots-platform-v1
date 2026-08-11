"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={className ?? "btn btn-ghost btn-sm"}
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
