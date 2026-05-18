"use client";

import styles from "./LandingPage.module.css";
import { Check, ArrowRight, Smartphone, Globe, Bot, Sparkles, Shield, BarChart3, Zap } from "lucide-react";
import InteractiveTechVisual from "./InteractiveTechVisual";

const AGENTS = [
  { emoji: "🧠", name: "LIYA", role: "Manager & Orchestrator" },
  { emoji: "🤟", name: "Signa", role: "Accessibility Specialist" },
  { emoji: "🔮", name: "Oracle", role: "Predictive Analyst" },
  { emoji: "📍", name: "Pathfinder", role: "Logistics & Dispatch" },
  { emoji: "💓", name: "Pulse", role: "Tech & Infrastructure" },
  { emoji: "👁️", name: "Insight", role: "Usage & Packages" },
  { emoji: "⚡", name: "Spark", role: "Sales & Onboarding" },
  { emoji: "🛡️", name: "Guardian", role: "Digital Detective" },
  { emoji: "🔗", name: "Vault", role: "Blockchain Ledger" },
  { emoji: "🔌", name: "Provisioner", role: "Operations & Scheduling" },
  { emoji: "🔍", name: "Analyzer", role: "B2B Reporting" },
  { emoji: "✉️", name: "Messenger", role: "Automations & Dispatch" },
];

const B2C_PLANS = [
  {
    tier: "Starter",
    price: "Free",
    currency: "",
    period: "Forever free",
    popular: false,
    features: [
      "5 AI queries per day",
      "Basic network diagnostics",
      "Package information",
      "English language support",
      "Community support",
    ],
  },
  {
    tier: "Pro",
    price: "499",
    currency: "Rs. ",
    period: "/month",
    popular: true,
    features: [
      "Unlimited AI queries",
      "Voice conversations (Sinhala, Tamil, English)",
      "Real-time usage analytics",
      "Scam detection & alerts",
      "Priority ticket resolution",
      "Smart package recommendations",
    ],
  },
  {
    tier: "Premium",
    price: "999",
    currency: "Rs. ",
    period: "/month",
    popular: false,
    features: [
      "Everything in Pro",
      "VR Teleshop access",
      "Predictive maintenance alerts",
      "Blockchain SLA verification",
      "Dedicated AI concierge",
      "Family account (up to 5 lines)",
      "24/7 human escalation",
    ],
  },
];

const B2B_INDUSTRIES = [
  { icon: "🏥", name: "Hospitals", desc: "Patient communication AI, appointment scheduling, lab report dispatch" },
  { icon: "🏦", name: "Banks", desc: "Customer support automation, fraud detection, transaction alerts" },
  { icon: "🎓", name: "Schools", desc: "Student helpdesk AI, fee management, parent notifications" },
  { icon: "🛒", name: "Supermarkets", desc: "Inventory AI, customer loyalty programs, delivery tracking" },
  { icon: "🏨", name: "Hotels", desc: "Guest concierge AI, booking management, multilingual support" },
  { icon: "🏢", name: "Corporate", desc: "Employee helpdesk, WFM reporting, automated HR workflows" },
];

const B2B_PLANS = [
  {
    tier: "Starter",
    price: "14,999",
    currency: "Rs. ",
    period: "/month",
    popular: false,
    features: [
      "Single department deployment",
      "Up to 500 queries/day",
      "3 custom AI agents",
      "Email & WhatsApp dispatch",
      "Basic analytics dashboard",
    ],
  },
  {
    tier: "Business",
    price: "49,999",
    currency: "Rs. ",
    period: "/month",
    popular: true,
    features: [
      "Multi-department deployment",
      "Unlimited queries",
      "8 custom AI agents",
      "Full API integration",
      "Advanced analytics & reporting",
      "Dedicated account manager",
      "Custom branding",
    ],
  },
  {
    tier: "Enterprise",
    price: "Custom",
    currency: "",
    period: "Contact sales",
    popular: false,
    features: [
      "Unlimited departments",
      "12 fully customized AI agents",
      "On-premise deployment option",
      "Blockchain audit trail",
      "Custom ML model training",
      "24/7 premium support",
      "SLA guaranteed uptime",
      "White-label solution",
    ],
  },
];

export default function LandingPage({ onTryLiya }) {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.landing}>
      {/* --- Navigation --- */}
      <nav className={styles.nav}>
        <img src="/assets/logo.png" alt="SLT NEXUS" className={styles.navLogo} />
        <div className={styles.navLinks}>
          <button className={styles.navLink} onClick={() => scrollTo("features")}>Features</button>
          <button className={styles.navLink} onClick={() => scrollTo("pricing")}>Pricing</button>
          <button className={styles.navLink} onClick={() => scrollTo("b2b")}>Enterprise</button>
          <button className={styles.navCta} onClick={onTryLiya}>Try LIYA AI →</button>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className={styles.hero}>
        <InteractiveTechVisual />
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot}></span>
          Sri Lanka&apos;s First Multi-Agent AI Platform
        </div>

        <h1 className={styles.heroTitle}>
          The Future of
          <br />
          <span className={styles.heroGradient}>Telecom AI</span>
        </h1>

        <p className={styles.heroSub}>
          Meet LIYA — 12 specialized AI agents working together to transform
          customer support, network operations, and enterprise communications
          for SLT-MOBITEL.
        </p>

        <div className={styles.heroButtons}>
          <button className={styles.btnPrimary} onClick={onTryLiya}>
            <Sparkles size={18} /> Experience LIYA AI
          </button>
          <button className={styles.btnSecondary} onClick={() => scrollTo("pricing")}>
            View Plans <ArrowRight size={16} />
          </button>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <div className={styles.statNum}>12</div>
            <div className={styles.statLabel}>AI Agents</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>3</div>
            <div className={styles.statLabel}>Languages</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>200+</div>
            <div className={styles.statLabel}>Accounts</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>24/7</div>
            <div className={styles.statLabel}>Available</div>
          </div>
        </div>
      </section>

      {/* --- Agents Showcase --- */}
      <section className={styles.section} id="features">
        <div className={styles.sectionTag}>Swarm Intelligence</div>
        <h2 className={styles.sectionTitle}>12 AI Agents, One Unified Brain</h2>
        <p className={styles.sectionDesc}>
          Each agent specializes in a unique domain — from network diagnostics
          to blockchain security. Together they form an intelligent swarm
          orchestrated by LIYA.
        </p>

        <div className={styles.agentsGrid}>
          {AGENTS.map((a) => (
            <div key={a.name} className={styles.agentCard}>
              <span className={styles.agentEmoji}>{a.emoji}</span>
              <div className={styles.agentName}>{a.name}</div>
              <div className={styles.agentRole}>{a.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Mobile App Section --- */}
      <section className={styles.appSection}>
        <div className={styles.appContent}>
          <div className={styles.sectionTag}>Mobile Experience</div>
          <h2 className={styles.sectionTitle}>SLT NEXUS in Your Pocket</h2>
          <p className={styles.sectionDesc}>
            Access LIYA AI, check your usage, pay bills, and manage your SLT
            account — all from the palm of your hand.
          </p>

          <div className={styles.appFeatures}>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Bot size={20} /></div>
              <div>
                <div className={styles.featureTitle}>Voice-Powered AI Chat</div>
                <div className={styles.featureDesc}>Talk to LIYA in Sinhala, Tamil, or English with natural voice recognition</div>
              </div>
            </div>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Globe size={20} /></div>
              <div>
                <div className={styles.featureTitle}>Real-Time Network Status</div>
                <div className={styles.featureDesc}>Instant diagnostics — power levels, SNR, attenuation at your fingertips</div>
              </div>
            </div>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Shield size={20} /></div>
              <div>
                <div className={styles.featureTitle}>Scam Protection</div>
                <div className={styles.featureDesc}>Guardian AI analyzes suspicious messages and protects you from fraud</div>
              </div>
            </div>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Smartphone size={20} /></div>
              <div>
                <div className={styles.featureTitle}>VR Teleshop</div>
                <div className={styles.featureDesc}>Browse and purchase SLT products in an immersive 3D virtual showroom</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.appMockup}>
          <div className={styles.mockupScreen}>
            <div className={styles.mockupLogo}>
              L<span className={styles.mockupLogoAccent}>I</span>YA
            </div>
            <div className={styles.mockupText}>
              Multi-Agent AI Avatar
              <br />SLT-MOBITEL
            </div>
            <div className={styles.mockupBars}>
              <div className={styles.mockupBar}><div className={styles.mockupBarFill} style={{width: "85%"}} /></div>
              <div className={styles.mockupBar}><div className={styles.mockupBarFill} style={{width: "62%"}} /></div>
              <div className={styles.mockupBar}><div className={styles.mockupBarFill} style={{width: "94%"}} /></div>
              <div className={styles.mockupBar}><div className={styles.mockupBarFill} style={{width: "45%"}} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- B2C Pricing --- */}
      <section className={styles.section} id="pricing">
        <div className={styles.sectionTag}>B2C Plans</div>
        <h2 className={styles.sectionTitle}>Choose Your Plan</h2>
        <p className={styles.sectionDesc}>
          Whether you&apos;re a casual user or need premium AI-powered telecom services,
          we have a plan for you.
        </p>

        <div className={styles.pricingGrid}>
          {B2C_PLANS.map((plan) => (
            <div key={plan.tier} className={`${styles.priceCard} ${plan.popular ? styles.priceCardPopular : ""}`}>
              <div className={styles.priceTier}>{plan.tier}</div>
              <div className={styles.priceAmount}>
                <span className={styles.priceCurrency}>{plan.currency}</span>
                {plan.price}
              </div>
              <div className={styles.pricePeriod}>{plan.period}</div>
              <ul className={styles.priceFeatures}>
                {plan.features.map((f, i) => (
                  <li key={i} className={styles.priceFeature}>
                    <Check size={16} className={styles.checkIcon} />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`${styles.priceBtn} ${plan.popular ? styles.priceBtnPrimary : styles.priceBtnOutline}`}>
                {plan.price === "Free" ? "Get Started" : "Subscribe Now"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* --- B2B Enterprise --- */}
      <section className={styles.section} id="b2b">
        <div className={styles.sectionTag}>Enterprise Solutions</div>
        <h2 className={styles.sectionTitle}>Transform Your Industry</h2>
        <p className={styles.sectionDesc}>
          Deploy LIYA&apos;s multi-agent AI system across your organization.
          Customized for hospitals, banks, schools, and more.
        </p>

        <div className={styles.b2bGrid}>
          {B2B_INDUSTRIES.map((ind) => (
            <div key={ind.name} className={styles.b2bCard}>
              <span className={styles.b2bIcon}>{ind.icon}</span>
              <div className={styles.b2bName}>{ind.name}</div>
              <div className={styles.b2bDesc}>{ind.desc}</div>
            </div>
          ))}
        </div>

        <div className={styles.b2bPricing}>
          {B2B_PLANS.map((plan) => (
            <div key={plan.tier} className={`${styles.priceCard} ${plan.popular ? styles.priceCardPopular : ""}`}>
              <div className={styles.priceTier}>{plan.tier}</div>
              <div className={styles.priceAmount}>
                <span className={styles.priceCurrency}>{plan.currency}</span>
                {plan.price}
              </div>
              <div className={styles.pricePeriod}>{plan.period}</div>
              <ul className={styles.priceFeatures}>
                {plan.features.map((f, i) => (
                  <li key={i} className={styles.priceFeature}>
                    <Check size={16} className={styles.checkIcon} />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`${styles.priceBtn} ${plan.popular ? styles.priceBtnPrimary : styles.priceBtnOutline}`}>
                {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* --- CTA Footer --- */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>
          Ready to <span className={styles.heroGradient}>Transform</span>?
        </h2>
        <p className={styles.ctaSub}>
          Experience the power of 12 AI agents working together.
          Try LIYA now — no signup required.
        </p>
        <button className={styles.btnPrimary} onClick={onTryLiya}>
          <Zap size={18} /> Launch LIYA AI
        </button>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerText}>© 2026 SLT-MOBITEL. SLT NEXUS — All rights reserved.</div>
        <div className={styles.footerLinks}>
          <button className={styles.footerLink}>Privacy Policy</button>
          <button className={styles.footerLink}>Terms of Service</button>
          <button className={styles.footerLink}>Support</button>
        </div>
      </footer>
    </div>
  );
}
