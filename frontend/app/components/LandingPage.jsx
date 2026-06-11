"use client";

import { useState } from "react";
import styles from "./LandingPage.module.css";
import Link from "next/link";
import { Check, ArrowRight, Smartphone, Globe, Bot, Sparkles, Shield, BarChart3, Zap } from "lucide-react";
import InteractiveTechVisual from "./InteractiveTechVisual";
import { tLanding, getAgents, getB2CPlans, getB2BIndustries, getB2BPlans } from "./landingTranslations";

export default function LandingPage({ onTryLiya }) {
  const [lang, setLang] = useState("en");

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleLanguage = () => {
    setLang(prev => prev === "en" ? "si" : prev === "si" ? "ta" : "en");
  };

  const curr = tLanding[lang];
  const AGENTS = getAgents(lang);
  const B2C_PLANS = getB2CPlans(lang);
  const B2B_INDUSTRIES = getB2BIndustries(lang);
  const B2B_PLANS = getB2BPlans(lang);

  return (
    <div className={styles.landing}>
      {/* --- Navigation --- */}
      <nav className={styles.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/assets/logo.png" alt="SLT NEXUS" className={styles.navLogo} />
          <div className={styles.heroBadge} style={{ margin: 0, color: '#ffffff', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }}>
            <span className={styles.heroBadgeDot}></span>
            {curr.platformBadge}
          </div>
        </div>
        <div className={styles.navLinks}>
          <button className={styles.navLink} onClick={() => scrollTo("features")}>{curr.navFeatures}</button>
          <button className={styles.navLink} onClick={() => scrollTo("pricing")}>{curr.navPricing}</button>
          <button className={styles.navLink} onClick={() => scrollTo("b2b")}>{curr.navEnterprise}</button>
          
          {/* Language Switcher */}
          <button className={styles.navLink} onClick={toggleLanguage} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '20px' }}>
            <Globe size={16} /> 
            {lang === "en" ? "English" : lang === "si" ? "සිංහල" : "தமிழ்"}
          </button>

          <button className={styles.navCta} onClick={onTryLiya}>{curr.navTryLiya}</button>
        </div>
      </nav>

      {/* --- Hero Section (Video Only) --- */}
      <section className={styles.hero} style={{ justifyContent: 'space-between', paddingTop: '140px', paddingBottom: '20px' }}>
        <video autoPlay loop muted playsInline className={styles.heroVideo}>
          <source src="/assets/landing-bg.mp4" type="video/mp4" />
        </video>

        <div style={{ flex: 1 }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, marginBottom: '10px' }}>
          <div className={styles.heroButtons}>
            <button className={styles.btnPrimary} onClick={onTryLiya}>
              <Sparkles size={18} /> {curr.experienceLiya}
            </button>
            <button className={styles.btnSecondary} onClick={() => scrollTo("intro")}>
              {curr.viewPlans} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* --- Intro Section (Text & Old Animation) --- */}
      <section className={styles.hero} id="intro">
        <InteractiveTechVisual />
        
        <h1 className={styles.heroTitle}>
          {curr.heroTitleLine1}
          {curr.heroTitleLine1 !== "" && <br />}
          <span className={styles.heroGradient}>{curr.heroTitleGradient}</span>
        </h1>

        <p className={styles.heroSub}>
          {curr.heroSub}
        </p>

        <div className={styles.heroStats} style={{ marginTop: '80px' }}>
          <div className={styles.stat}>
            <div className={styles.statNum}>12</div>
            <div className={styles.statLabel} style={{ color: '#ffffff' }}>{curr.statAgents}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>3</div>
            <div className={styles.statLabel} style={{ color: '#ffffff' }}>{curr.statLanguages}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>200+</div>
            <div className={styles.statLabel} style={{ color: '#ffffff' }}>{curr.statAccounts}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>24/7</div>
            <div className={styles.statLabel} style={{ color: '#ffffff' }}>{curr.statAvailable}</div>
          </div>
        </div>
      </section>

      {/* --- Agents Showcase --- */}
      <section className={styles.section} id="features">
        <div className={styles.sectionTag}>{curr.swarmTag}</div>
        <h2 className={styles.sectionTitle}>{curr.swarmTitle}</h2>
        <p className={styles.sectionDesc}>
          {curr.swarmDesc}
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
          <div className={styles.sectionTag}>{curr.appTag}</div>
          <h2 className={styles.sectionTitle}>{curr.appTitle}</h2>
          <p className={styles.sectionDesc}>
            {curr.appDesc}
          </p>

          <div className={styles.appFeatures}>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Bot size={20} /></div>
              <div>
                <div className={styles.featureTitle}>{curr.appFeature1Title}</div>
                <div className={styles.featureDesc}>{curr.appFeature1Desc}</div>
              </div>
            </div>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Globe size={20} /></div>
              <div>
                <div className={styles.featureTitle}>{curr.appFeature2Title}</div>
                <div className={styles.featureDesc}>{curr.appFeature2Desc}</div>
              </div>
            </div>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Shield size={20} /></div>
              <div>
                <div className={styles.featureTitle}>{curr.appFeature3Title}</div>
                <div className={styles.featureDesc}>{curr.appFeature3Desc}</div>
              </div>
            </div>
            <div className={styles.appFeature}>
              <div className={styles.featureIcon}><Smartphone size={20} /></div>
              <div>
                <div className={styles.featureTitle}>{curr.appFeature4Title}</div>
                <div className={styles.featureDesc}>{curr.appFeature4Desc}</div>
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
        <div className={styles.sectionTag}>{curr.pricingTag}</div>
        <h2 className={styles.sectionTitle}>{curr.pricingTitle}</h2>
        <p className={styles.sectionDesc}>
          {curr.pricingDesc}
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
                {plan.price === "Free" || plan.price === "නොමිලේ" || plan.price === "இலவசம்" ? curr.getStartedBtn : curr.subscribeBtn}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* --- B2B Enterprise --- */}
      <section className={styles.section} id="b2b">
        <div className={styles.sectionTag}>{curr.b2bTag}</div>
        <h2 className={styles.sectionTitle}>{curr.b2bTitle}</h2>
        <p className={styles.sectionDesc}>
          {curr.b2bDesc}
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
                {plan.price === "Custom" || plan.price === "අභිරුචි" || plan.price === "தனிப்பயன்" ? curr.contactSalesBtn : curr.getStartedBtn}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* --- CTA Footer --- */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>
          {curr.ctaTitleLine1}
          <span className={styles.heroGradient}>{curr.ctaTitleGradient}</span>
          {curr.ctaTitleLine2}
        </h2>
        <p className={styles.ctaSub}>
          {curr.ctaSub}
        </p>
        <button className={styles.btnPrimary} onClick={onTryLiya}>
          <Zap size={18} /> {curr.launchLiyaBtn}
        </button>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerText}>{curr.footerText}</div>
        <div className={styles.footerLinks}>
          <Link href="/privacy" className={styles.footerLink}>{curr.footerPrivacy}</Link>
          <Link href="/terms" className={styles.footerLink}>{curr.footerTerms}</Link>
          <Link href="/support" className={styles.footerLink}>{curr.footerSupport}</Link>
        </div>
      </footer>
    </div>
  );
}
