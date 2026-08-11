import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FaqAccordion } from "@/components/faq-accordion";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="glow" />
          <div className="wrap" style={{ position: "relative", zIndex: 1 }}>
            <span className="eyebrow">
              <span className="dot" />
              Easy-to-Deploy, ROI-Driven Voice AI
            </span>
            <h1>
              Every ring your team can&apos;t answer is a customer{" "}
              <span className="grad">calling your competitor instead.</span>
            </h1>
            <p className="hero-sub">
              Voice Chatbots Platform gives your sales, support, and operations lines a
              pre-trained AI voice agent that picks up every call, qualifies it, and
              resolves it — 24/7, in your industry&apos;s language, with no developers and
              no six-month rollout.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary">
                Deploy My Voice Agent Free for 14 Days
              </Link>
              <Link href="/#how" className="btn btn-ghost">
                See a Live Call Walkthrough
              </Link>
            </div>
            <p className="hero-note">
              No credit card to start. Pre-built templates for healthcare, e-commerce,
              real estate, home services &amp; more.
            </p>

            <div className="hero-visual">
              <div className="call-card">
                <div className="call-avatar">SC</div>
                <div className="call-meta">
                  <div className="call-title">
                    Inbound — Support Line · &quot;My order hasn&apos;t shipped&quot;
                  </div>
                  <div className="call-sub">
                    Resolved in 2m 14s · order status confirmed, tracking sent via SMS
                  </div>
                </div>
                <div className="call-status">Resolved</div>
              </div>
              <div className="call-card">
                <div className="call-avatar">MR</div>
                <div className="call-meta">
                  <div className="call-title">
                    Inbound — Sales Line · &quot;Do you have Saturday availability?&quot;
                  </div>
                  <div className="call-sub">
                    Qualified lead · booked consult · synced to CRM automatically
                  </div>
                </div>
                <div className="call-status">Booked</div>
              </div>
              <div className="call-card">
                <div className="call-avatar">EO</div>
                <div className="call-meta">
                  <div className="call-title">
                    Internal — IT Helpdesk · &quot;Password reset for payroll
                    system&quot;
                  </div>
                  <div className="call-sub">
                    Complex case detected · warm-transferred to on-call specialist
                  </div>
                </div>
                <div className="call-status pending">Escalated</div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="stats">
          <div className="wrap">
            <div className="stats-grid">
              <div>
                <div className="stat-num">62%</div>
                <div className="stat-label">
                  of inbound calls to understaffed teams go unanswered during peak
                  hours — each one a missed sale or an angrier customer.
                </div>
              </div>
              <div>
                <div className="stat-num">11 min</div>
                <div className="stat-label">
                  average time for a customer to launch a fully configured,
                  industry-tuned voice agent from a pre-built template.
                </div>
              </div>
              <div>
                <div className="stat-num">$146K</div>
                <div className="stat-label">
                  average annual savings reported by mid-market customers who
                  replaced overflow call staffing with Voice Chatbots Platform.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section-pad" id="features">
          <div className="wrap">
            <div className="section-head">
              <span className="kicker">Why Teams Switch</span>
              <h2>Built to be deployed by you, not your engineering team.</h2>
              <p>
                Generic platforms like Dialogflow or Lex hand you a toolkit and a
                six-month build. Enterprise platforms like LivePerson hand you a
                six-figure contract and an implementation team. We hand you a working
                voice agent by lunch.
              </p>
            </div>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Never lose a call to voicemail again</h3>
                <p>
                  Every sales, support, and internal line stays answered around the
                  clock — no hold music, no &quot;we&apos;re currently closed.&quot;
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Live in days, not quarters</h3>
                <p>
                  Pick a pre-built, pre-trained template for your industry and go
                  live with no-code configuration — no data scientists, no dev
                  sprint.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Fluent in your industry, not just English</h3>
                <p>
                  Healthcare intake, e-commerce order status, real estate
                  scheduling — trained vocabulary and workflows for the calls you
                  actually get.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                  </svg>
                </div>
                <h3>Plugs into what you already run</h3>
                <p>
                  Native connections to the CRMs, helpdesks, and calendars your
                  teams already use — no rip-and-replace, no custom middleware
                  project.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3v18h18" strokeWidth="2" strokeLinecap="round" />
                    <path
                      d="M18.7 8l-5.1 5.1-2.8-2.8L7 14"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Proves its own ROI, every month</h3>
                <p>
                  A live dashboard shows calls handled, cost per call, deflection
                  rate, and hours saved — so renewal is a formality, not a
                  negotiation.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path
                      d="M12 8v4l3 2"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>One platform, every department</h3>
                <p>
                  Sales, support, and internal ops each get their own tuned agent
                  and line — managed from a single dashboard as you scale across
                  teams.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section
          className="section-pad"
          id="testimonials"
          style={{
            background: "var(--bg-alt)",
            borderTop: "1px solid var(--card-border)",
            borderBottom: "1px solid var(--card-border)",
          }}
        >
          <div className="wrap">
            <div className="section-head">
              <span className="kicker">Real Results</span>
              <h2>
                Businesses of every size, the same story: fewer missed calls, lower
                cost per call.
              </h2>
            </div>
            <div className="testimonial-grid">
              <div className="testimonial-card">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} viewBox="0 0 20 20">
                      <path d="M10 1l2.8 6 6.2.8-4.6 4.4 1.2 6.2L10 15.6 4.4 18.4l1.2-6.2L1 7.8 7.2 7z" />
                    </svg>
                  ))}
                </div>
                <p className="testimonial-quote">
                  &quot;We&apos;re a two-location dental practice — we don&apos;t
                  have an IT department, we have me. I picked the healthcare
                  template on a Tuesday and by Thursday it was booking appointments
                  after hours. It paid for itself in the first month just from
                  calls we used to miss.&quot;
                </p>
                <div className="testimonial-person">
                  <div className="testimonial-avatar">RD</div>
                  <div>
                    <div className="testimonial-name">Renee Dobson</div>
                    <div className="testimonial-title">
                      Owner, Dobson Family Dental (small business, 2 locations)
                    </div>
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} viewBox="0 0 20 20">
                      <path d="M10 1l2.8 6 6.2.8-4.6 4.4 1.2 6.2L10 15.6 4.4 18.4l1.2-6.2L1 7.8 7.2 7z" />
                    </svg>
                  ))}
                </div>
                <p className="testimonial-quote">
                  &quot;We evaluated Dialogflow and honestly bounced off it — we
                  needed a working agent, not a framework. The Pro plan&apos;s
                  e-commerce template understood &apos;where&apos;s my
                  order&apos; in about six different phrasings out of the box.
                  Our support queue dropped by a third in the first month.&quot;
                </p>
                <div className="testimonial-person">
                  <div className="testimonial-avatar">JT</div>
                  <div>
                    <div className="testimonial-name">Jordan Tran</div>
                    <div className="testimonial-title">
                      Director of Customer Support, Meridian Home Goods
                      (mid-market, ~140 employees)
                    </div>
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} viewBox="0 0 20 20">
                      <path d="M10 1l2.8 6 6.2.8-4.6 4.4 1.2 6.2L10 15.6 4.4 18.4l1.2-6.2L1 7.8 7.2 7z" />
                    </svg>
                  ))}
                </div>
                <p className="testimonial-quote">
                  &quot;We run voice AI across four departments — sales, support,
                  facilities, and IT helpdesk — and the pitch that sold us was
                  that we didn&apos;t need four separate vendor relationships.
                  Deployment across departments that would&apos;ve taken our
                  engineering team a year took our ops group about three
                  weeks.&quot;
                </p>
                <div className="testimonial-person">
                  <div className="testimonial-avatar">PA</div>
                  <div>
                    <div className="testimonial-name">Priya Anand</div>
                    <div className="testimonial-title">
                      VP of Customer Operations, Northfield Enterprises
                      (enterprise, multi-department)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW / TRUST */}
        <section className="section-pad" id="how">
          <div className="wrap">
            <div className="section-head" style={{ marginBottom: 48 }}>
              <span className="kicker">The Honest Comparison</span>
              <h2>
                You don&apos;t need a platform that can do everything. You need
                one built for your call.
              </h2>
              <p>
                Developer-first platforms make you build the agent. Enterprise
                platforms make you pay for capacity you&apos;ll never use. Voice
                Chatbots Platform starts with a pre-trained template for your
                exact use case and lets you configure it in plain English — so
                you get power without the overhead.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section
          className="section-pad"
          id="pricing"
          style={{
            background: "var(--bg-alt)",
            borderTop: "1px solid var(--card-border)",
            borderBottom: "1px solid var(--card-border)",
          }}
        >
          <div className="wrap">
            <div
              className="section-head"
              style={{ margin: "0 auto 56px", textAlign: "center" }}
            >
              <span className="kicker" style={{ display: "block", textAlign: "center" }}>
                Simple, Transparent Pricing
              </span>
              <h2>
                One flat monthly rate. No per-minute surprises, no annual lock-in
                required.
              </h2>
              <p style={{ marginLeft: "auto", marginRight: "auto" }}>
                Every plan starts with a 14-day free trial — full access, no
                credit card required to begin.
              </p>
            </div>
            <div className="pricing-grid">
              <div className="price-card">
                <div className="price-name">Starter</div>
                <div className="price-tagline">
                  For single-location businesses answering one line.
                </div>
                <div className="price-amount">
                  <span className="num">$500</span>
                  <span className="per">/ month</span>
                </div>
                <div className="price-trial">Includes 14-day free trial</div>
                <ul className="price-feats">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    1 voice agent, 1 phone line (sales or support)
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Pre-built industry template + no-code configuration
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Up to 1,000 calls / month
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Standard CRM &amp; calendar integrations
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    ROI dashboard &amp; call transcripts
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Email &amp; chat support
                  </li>
                </ul>
                <Link href="/signup" className="btn btn-ghost btn-block">
                  Start My 14-Day Trial
                </Link>
              </div>
              <div className="price-card featured">
                <span className="price-badge">Most Popular</span>
                <div className="price-name">Pro</div>
                <div className="price-tagline">
                  For growing and multi-department teams across sales, support
                  &amp; ops.
                </div>
                <div className="price-amount">
                  <span className="num">$750</span>
                  <span className="per">/ month</span>
                </div>
                <div className="price-trial">Includes 14-day free trial</div>
                <ul className="price-feats">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Up to 5 voice agents across departments &amp; lines
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Full template library + custom industry tuning
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Up to 6,000 calls / month
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Advanced integrations (CRM, helpdesk, warm transfer)
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Cross-department analytics &amp; ROI reporting
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Priority support + dedicated onboarding specialist
                  </li>
                </ul>
                <Link href="/signup" className="btn btn-primary btn-block">
                  Start My 14-Day Trial
                </Link>
              </div>
            </div>
            <p className="pricing-note">
              Running voice AI across more than 5 departments or need custom
              SLAs? <Link href="/signup">Talk to us about Enterprise</Link>.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-pad" id="faq">
          <div className="wrap">
            <div
              className="section-head"
              style={{ margin: "0 auto 40px", textAlign: "center" }}
            >
              <span className="kicker" style={{ display: "block", textAlign: "center" }}>
                Fair Questions
              </span>
              <h2>You&apos;ve been burned by &quot;AI&quot; tools before. Ask us the hard stuff.</h2>
            </div>
            <FaqAccordion />
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="cta-section">
          <div className="wrap">
            <div className="cta-box">
              <h2>
                Stop losing calls to hold music, voicemail, and competitors who
                pick up.
              </h2>
              <p>
                Deploy a pre-trained voice agent for your industry in the next 15
                minutes. No credit card, no developers, no six-month contract.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn btn-primary">
                  Deploy My Voice Agent Free for 14 Days
                </Link>
                <Link href="/#how" className="btn btn-ghost">
                  Talk to Sales First
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="logo">
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
              <p>
                Easy-to-deploy, ROI-driven voice AI for sales, support, and
                internal ops — built for small, mid-market, and multi-department
                teams.
              </p>
            </div>
            <div className="footer-cols">
              <div className="footer-col">
                <h4>Product</h4>
                <Link href="/#features">Features</Link>
                <Link href="/#pricing">Pricing</Link>
                <Link href="/#faq">FAQ</Link>
              </div>
              <div className="footer-col">
                <h4>Industries</h4>
                <a href="#">Healthcare</a>
                <a href="#">E-Commerce</a>
                <a href="#">Real Estate</a>
                <a href="#">Home Services</a>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Contact</a>
                <a href="#">Privacy</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Voice Chatbots Platform. All rights reserved.</span>
            <span>Made for teams tired of missed calls.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
