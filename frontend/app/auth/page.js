"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { useAudio } from "../context/AudioContext";
import { Phone, Lock, Hash, ArrowRight, Zap, User, CreditCard, Mail, MapPin, ShieldCheck, QrCode, Smartphone } from "lucide-react";
import styles from "../page.module.css";

import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const { playMusic } = useAudio();
  const [tab, setTab] = useState("existing"); // "existing" or "new"
  const [step, setStep] = useState(1);
  const [isDesktop, setIsDesktop] = useState(true);
  
  // Existing Customer State
  const [phone, setPhone] = useState("");
  
  // New Customer State
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [nic, setNic] = useState("");
  const [email, setEmail] = useState("");
  const [gpsVerified, setGpsVerified] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Common State
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    playMusic();
    setIsDesktop(window.innerWidth > 768);
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [playMusic]);

  // --- EXISTING CUSTOMER FLOW ---
  const handleExistingPhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 9) {
      setError("Please enter a valid SLT phone number");
      return;
    }
    setError("");
    setLoading(true);
    
    // Prototype: Bypass Supabase to avoid rate limits
    setTimeout(() => {
      setLoading(false);
      setStep(2); // Mock OTP step
    }, 600);
  };

  const handleExistingOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return setError("Enter a 6-digit OTP");
    
    setLoading(true);
    
    // Prototype: Accept any 6 digit OTP
    setTimeout(() => {
      setLoading(false);
      router.push('/admin');
    }, 800);
  };


  // --- NEW CUSTOMER FLOW ---
  const handleGpsFetch = () => {
    setGpsLoading(true);
    setTimeout(() => {
      setGpsVerified(true);
      setGpsLoading(false);
    }, 1500);
  };

  const handleNewCustomerSubmit = (e) => {
    e.preventDefault();
    if (!name || !nic || !mobile || mobile.length < 9) {
      setError("Please fill all details correctly.");
      return;
    }
    if (!gpsVerified) {
      setError("Please verify your location first.");
      return;
    }
    if (!isHuman) {
      setError("Please complete human verification.");
      return;
    }
    setError("");
    setStep(2); // Go to OTP
  };

  const handleNewCustomerOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return setError("Enter a 6-digit OTP");
    
    setLoading(true);
    
    // Prototype: Accept any OTP for new connection
    setTimeout(() => {
      setLoading(false);
      router.push('/admin');
    }, 800);
  };

  return (
    <main className={styles.mainContainer} style={{ background: "linear-gradient(135deg, #09090b 0%, #171723 100%)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      
      {/* Container holding both QR Sidebar and Main Form */}
      <div style={{ display: "flex", gap: "20px", maxWidth: "800px", width: "100%" }}>
        
        {/* Left Sidebar - QR Codes (Modern App Download) */}
        <div style={{ flex: "1", background: "rgba(255, 255, 255, 0.03)", padding: "30px", borderRadius: "16px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "white", display: isDesktop ? 'flex' : 'none' }}>
          <Zap size={40} color="#3b82f6" style={{ marginBottom: "20px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px", textAlign: "center" }}>Get the NEXUS App</h2>
          <p style={{ color: "#a1a1aa", fontSize: "14px", textAlign: "center", marginBottom: "30px" }}>Scan to download on your device for the best experience.</p>
          
          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "white", padding: "10px", borderRadius: "8px", marginBottom: "10px" }}>
                <QrCode size={60} color="black" />
              </div>
              <p style={{ fontSize: "12px", color: "#a1a1aa" }}>iOS</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "white", padding: "10px", borderRadius: "8px", marginBottom: "10px" }}>
                <QrCode size={60} color="black" />
              </div>
              <p style={{ fontSize: "12px", color: "#a1a1aa" }}>Android</p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div style={{ flex: "1.5", background: "rgba(255, 255, 255, 0.05)", padding: "40px", borderRadius: "16px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "Inter, sans-serif" }}>
          
          {/* Tabs */}
          {step === 1 && (
            <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: "8px", marginBottom: "30px", padding: "5px" }}>
              <button onClick={() => setTab("existing")} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: tab === "existing" ? "rgba(255,255,255,0.1)" : "transparent", color: tab === "existing" ? "white" : "#a1a1aa", cursor: "pointer", fontWeight: tab === "existing" ? "600" : "400", transition: "0.3s" }}>
                Existing User
              </button>
              <button onClick={() => setTab("new")} style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "none", background: tab === "new" ? "rgba(255,255,255,0.1)" : "transparent", color: tab === "new" ? "white" : "#a1a1aa", cursor: "pointer", fontWeight: tab === "new" ? "600" : "400", transition: "0.3s" }}>
                New Connection
              </button>
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "5px" }}>
              {step === 2 ? "Verify OTP" : tab === "existing" ? "Welcome Back" : "Create Account"}
            </h1>
            <p style={{ color: "#a1a1aa", fontSize: "14px" }}>
              {step === 2 ? "Enter the 6-digit code sent to your mobile" : tab === "existing" ? "Log in with your SLT Number" : "Join SLT-MOBITEL today"}
            </p>
          </div>

          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* EXISTING USER TAB */}
          {tab === "existing" && step === 1 && (
            <form onSubmit={handleExistingPhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ position: "relative" }}>
                <Phone size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
                <input 
                  type="text" placeholder="SLT Number (e.g. 0112895800)" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={10} required
                  style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none" }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ background: "linear-gradient(45deg, #3b82f6, #8b5cf6)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                {loading ? "Checking..." : "Continue"} <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* NEW CUSTOMER TAB */}
          {tab === "new" && step === 1 && (
            <form onSubmit={handleNewCustomerSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <User size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none" }} />
              </div>
              <div style={{ position: "relative" }}>
                <CreditCard size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" placeholder="NIC Number" value={nic} onChange={(e) => setNic(e.target.value)} required style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none" }} />
              </div>
              <div style={{ position: "relative" }}>
                <Smartphone size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
                <input type="text" placeholder="Mobile Number (07X...)" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} required style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none" }} />
              </div>
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <Mail size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
                <input type="email" placeholder="Email Address (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none" }} />
              </div>

              {/* Location & Human Check */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button type="button" onClick={handleGpsFetch} disabled={gpsVerified || gpsLoading} style={{ flex: 1, background: gpsVerified ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", border: gpsVerified ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)", color: gpsVerified ? "#10b981" : "white", padding: "10px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                  <MapPin size={16} /> {gpsLoading ? "Fetching..." : gpsVerified ? "Coverage Validated" : "Fetch Location"}
                </button>
                <div onClick={() => setIsHuman(!isHuman)} style={{ flex: 1, background: isHuman ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)", border: isHuman ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)", color: isHuman ? "#3b82f6" : "white", padding: "10px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                  <ShieldCheck size={16} /> {isHuman ? "Human Verified" : "I am Human"}
                </div>
              </div>

              <button type="submit" style={{ background: "linear-gradient(45deg, #3b82f6, #8b5cf6)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                Send Verification Code <ArrowRight size={18} />
              </button>
              
              <div style={{ textAlign: "center", marginTop: "10px" }}>
                <span style={{ fontSize: "12px", color: "#a1a1aa", cursor: "pointer", textDecoration: "underline" }} onClick={() => setStep(2)}>
                  Already started? Verify Mobile
                </span>
              </div>
            </form>
          )}

          {/* OTP STEP (Shared for both) */}
          {step === 2 && (
            <form onSubmit={tab === "existing" ? handleExistingOtpSubmit : handleNewCustomerOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ position: "relative" }}>
                <Hash size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
                <input 
                  type="text" placeholder="Enter 6-digit OTP" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={6} required
                  style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none", letterSpacing: "2px" }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ background: "linear-gradient(45deg, #3b82f6, #8b5cf6)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                {loading ? "Verifying..." : "Enter NEXUS"} <ArrowRight size={18} />
              </button>
              <div style={{ textAlign: "center", marginTop: "10px" }}>
                <span style={{ fontSize: "12px", color: "#a1a1aa", cursor: "pointer", textDecoration: "underline" }} onClick={() => setStep(1)}>
                  Back to Details
                </span>
              </div>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}
