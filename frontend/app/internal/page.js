"use client";

import { Wrench, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import styles from "../page.module.css";

export default function InternalPortal() {
  return (
    <main style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center", color: "white" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "10px" }}>SLT NEXUS Internal Hub</h1>
        <p style={{ color: "#94a3b8", marginBottom: "40px" }}>Select your secure access portal</p>
        
        <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
          
          <Link href="/internal/technician" style={{ textDecoration: "none" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "30px", borderRadius: "16px", width: "250px", cursor: "pointer", transition: "transform 0.2s, background 0.2s" }}
                 onMouseOver={e => e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)"}
                 onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
              <div style={{ background: "#3b82f6", width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
                <Wrench size={28} color="white" />
              </div>
              <h2 style={{ fontSize: "20px", color: "white", marginBottom: "10px" }}>Technician Portal</h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>WFM Dispatch <ArrowRight size={14} /></p>
            </div>
          </Link>

          <Link href="/internal/admin" style={{ textDecoration: "none" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "30px", borderRadius: "16px", width: "250px", cursor: "pointer", transition: "transform 0.2s, background 0.2s" }}
                 onMouseOver={e => e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)"}
                 onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
              <div style={{ background: "#8b5cf6", width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
                <Shield size={28} color="white" />
              </div>
              <h2 style={{ fontSize: "20px", color: "white", marginBottom: "10px" }}>Admin Portal</h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>Reports & CRM <ArrowRight size={14} /></p>
            </div>
          </Link>

        </div>
      </div>
    </main>
  );
}
