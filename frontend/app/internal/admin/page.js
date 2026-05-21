"use client";

import { useState } from "react";
import { Shield, Lock, ArrowRight, BarChart } from "lucide-react";
import styles from "../../page.module.css";

export default function AdminPortal() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "admin123") {
      setError("");
      setIsLoggedIn(true);
    } else {
      setError("Invalid admin password.");
    }
  };

  if (isLoggedIn) {
    return (
      <main style={{ padding: "40px", fontFamily: "Inter, sans-serif", background: "#f4f4f5", minHeight: "100vh", color: "black" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "30px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Shield size={32} color="#8b5cf6" /> Admin Reporting Dashboard
        </h1>
        
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", maxWidth: "800px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>WFM Daily Reports</h2>
          <p style={{ color: "#52525b", marginBottom: "20px", lineHeight: "1.6" }}>
            This portal allows you to manually request or review the WFM reports. In production, these reports are securely processed by the <strong>Analyzer AI Agent</strong> and dispatched via the <strong>Messenger AI Agent</strong> only to internal staff.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            {["Morning", "Afternoon", "Evening", "Day Start", "Full Details", "Day End"].map(report => (
              <div key={report} style={{ border: "1px solid #e4e4e7", padding: "15px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "500" }}>{report} Report</span>
                <button style={{ background: "#f4f4f5", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                  Request via AI
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", width: "100%", maxWidth: "400px", fontFamily: "Inter, sans-serif" }}>
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ background: "#8b5cf6", width: "50px", height: "50px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto" }}>
            <Shield size={24} color="white" />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "5px", color: "black" }}>
            Admin Login
          </h1>
          <p style={{ color: "#71717a", fontSize: "14px" }}>
            Internal Management Portal
          </p>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ position: "relative" }}>
            <Lock size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "black", fontSize: "15px", outline: "none" }}
              required
            />
          </div>
          <button type="submit" style={{ background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "10px" }}>
            Access Dashboard <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </main>
  );
}
