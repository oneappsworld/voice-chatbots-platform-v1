import Link from "next/link";

export function AdminTabs({ active }: { active: "overview" | "team" | "settings" | "content" }) {
  const tabs: { key: typeof active; href: string; label: string }[] = [
    { key: "overview", href: "/admin", label: "Overview" },
    { key: "team", href: "/admin/team", label: "Team" },
    { key: "settings", href: "/admin/settings", label: "Bot Settings" },
    { key: "content", href: "/admin/content", label: "Content" },
  ];

  return (
    <div className="pill-group" style={{ marginBottom: 24 }}>
      {tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} className={`pill${active === tab.key ? " active" : ""}`}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
