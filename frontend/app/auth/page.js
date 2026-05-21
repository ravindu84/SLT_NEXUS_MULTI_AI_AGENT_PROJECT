"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { useAudio } from "../context/AudioContext";
import { Phone, Lock, Hash, ArrowRight } from "lucide-react";
import styles from "../page.module.css";

export default function AuthPage({ onAuthSuccess }) {
  const { playMusic } = useAudio();
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Password
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    // Ensure music is playing when entering auth screen
    playMusic();
  }, [playMusic]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 9) {
      setError("Please enter a valid phone number");
      return;
    }
    setError("");
    setLoading(true);

    const dummyEmail = `${phone}@sltnexus.local`;
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: "123", // Default dummy password
    });

    setLoading(false);

    if (signInData.user) {
      setIsLogin(true);
      if (onAuthSuccess) onAuthSuccess();
    } else {
      setIsLogin(false);
      setStep(2); // Proceed to OTP for sign up
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }
    setError("");
    setStep(3); // Proceed to set password
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const dummyEmail = `${phone}@sltnexus.local`;

    const { data, error } = await supabase.auth.signUp({
      email: dummyEmail,
      password: password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      // Signup successful
      if (onAuthSuccess) onAuthSuccess();
    }
  };

  return (
    <main className={styles.mainContainer} style={{ background: "linear-gradient(135deg, #09090b 0%, #171723 100%)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "40px", borderRadius: "16px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: "400px", color: "white", fontFamily: "Inter, sans-serif" }}>
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ background: "linear-gradient(45deg, #3b82f6, #8b5cf6)", width: "50px", height: "50px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto" }}>
            <Zap size={24} color="white" />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "5px" }}>
            {step === 1 ? "Welcome to SLT NEXUS" : step === 2 ? "Verify Number" : "Create Password"}
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: "14px" }}>
            {step === 1 ? "Enter your registered SLT phone number to continue." : step === 2 ? `Enter the 6-digit code sent to ${phone}` : "Secure your account"}
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handlePhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ position: "relative" }}>
              <Phone size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text" 
                placeholder="0112895800" 
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={10}
                style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none", transition: "border 0.3s" }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={{ background: "linear-gradient(45deg, #3b82f6, #8b5cf6)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Checking..." : "Continue"} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ position: "relative" }}>
              <Hash size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="text" 
                placeholder="Enter any 6 digits (Mock OTP)" 
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
                style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none", letterSpacing: "2px" }}
                required
              />
            </div>
            <button type="submit" style={{ background: "linear-gradient(45deg, #3b82f6, #8b5cf6)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
              Verify Code <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "white", fontSize: "15px", outline: "none" }}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={{ background: "linear-gradient(45deg, #3b82f6, #8b5cf6)", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {loading ? "Creating Account..." : "Create Account & Enter NEXUS"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
