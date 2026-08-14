import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { AdminTabs } from "@/components/admin-tabs";
import { CustomerLookupPanel } from "@/components/customer-lookup-panel";
import { listCustomers } from "@/app/admin/actions";
import { getOrgContext } from "@/lib/org-context";

export const metadata: Metadata = {
  title: "Admin Customers — ChatSyn",
};

export default async function AdminCustomersPage() {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  const result = await listCustomers();

  return (
    <div className="dash-shell">
      <AppHeader active="admin" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Admin dashboard · {org.organizationName}</span>
              <h1 className="dash-title">Customers</h1>
              <p className="dash-subtitle">
                Every caller who&apos;s left contact info through a lead or appointment, built from
                your own data — no external CRM connection required.
              </p>
            </div>
          </div>

          <AdminTabs active="customers" />

          <section className="panel">
            <div className="panel-title">Customer roster</div>
            <div className="panel-subtitle">
              Click a customer to see their lead and appointment history.
            </div>
            <CustomerLookupPanel initialCustomers={result.ok ? result.customers : []} />
          </section>
        </div>
      </main>
    </div>
  );
}
