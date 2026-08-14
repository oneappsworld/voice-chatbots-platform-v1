import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { HelpFaqAccordion } from "@/components/help-faq-accordion";
import { SupportContactForm } from "@/components/support-contact-form";

export const metadata: Metadata = {
  title: "Help & Support — ChatSyn",
};

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="dash-shell">
      <AppHeader active="help" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <h1 className="dash-title">Help &amp; Support</h1>
              <p className="dash-subtitle">
                Answers to common questions, or send us a message and we&apos;ll reply to your
                account email.
              </p>
            </div>
          </div>

          <div className="settings-grid">
            <section className="panel">
              <div className="panel-title">Frequently asked questions</div>
              <div className="panel-subtitle">The questions we hear most from ChatSyn users.</div>
              <HelpFaqAccordion />
            </section>

            <section className="panel">
              <div className="panel-title">Contact us</div>
              <div className="panel-subtitle">Can&apos;t find an answer above? Send us a note.</div>
              <SupportContactForm />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
