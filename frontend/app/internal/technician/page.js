"use client";

import { useState } from "react";
import { User, Key, ArrowRight, Wrench } from "lucide-react";
import styles from "../../page.module.css";

const TECHNICIAN_DB = {
  "KOSALA": "14510",
  "JANITH": "14511",
  "SANJEEWA": "14512",
  "NALAKA": "14513",
  "LAHIRU": "14514",
  "ASELA": "14515",
  "THARINDU": "14516",
  "PRASAD": "14517",
  "KAMAL": "14518",
  "SOMASIRI": "14519"
};

export default function TechnicianPortal() {
  const [name, setName] = useState("");
  const [serviceNo, setServiceNo] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const techName = name.toUpperCase().trim();
    if (TECHNICIAN_DB[techName] === serviceNo) {
      setError("");
      setIsLoggedIn(true);
      fetchTickets(techName);
    } else {
      setError("Invalid Name or Service Number. Please check again.");
    }
  };

  const fetchTickets = async (techName) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://16.171.166.199.nip.io";
      const res = await fetch(`${API_URL}/wfm/active-faults`);
      const data = await res.json();
      const myTickets = data.fault_tickets.filter(t => t.technician === techName);
      setTickets(myTickets);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoggedIn) {
    return (
      <main style={{ padding: "40px", fontFamily: "Inter, sans-serif", background: "#f4f4f5", minHeight: "100vh", color: "black" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Wrench size={32} color="#3b82f6" /> {name.toUpperCase()}'s WFM Dispatch Dashboard
        </h1>
        <p style={{ color: "#52525b", marginBottom: "30px" }}>Service ID: {serviceNo}</p>
        
        <div style={{ display: "grid", gap: "20px" }}>
          {tickets.length === 0 ? (
            <p>No active tickets assigned to you right now.</p>
          ) : (
            tickets.map((ticket, i) => (
              <div key={i} style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ margin: 0, color: "#18181b" }}>Ticket {ticket.ticket_id}</h3>
                  <span style={{ background: "#fef08a", color: "#854d0e", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                    {ticket.status}
                  </span>
                </div>
                <p><strong>Customer Phone:</strong> {ticket.phone_number}</p>
                <p><strong>Created At:</strong> {ticket.created_at}</p>
              </div>
            ))
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", width: "100%", maxWidth: "400px", fontFamily: "Inter, sans-serif" }}>
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ background: "#3b82f6", width: "50px", height: "50px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 15px auto" }}>
            <Wrench size={24} color="white" />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "5px", color: "black" }}>
            Technician Login
          </h1>
          <p style={{ color: "#71717a", fontSize: "14px" }}>
            Internal WFM Portal
          </p>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ position: "relative" }}>
            <User size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              placeholder="Your Name (e.g. KOSALA)" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "black", fontSize: "15px", outline: "none" }}
              required
            />
          </div>
          <div style={{ position: "relative" }}>
            <Key size={18} color="#a1a1aa" style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              placeholder="Service Number (e.g. 14510)" 
              value={serviceNo}
              onChange={(e) => setServiceNo(e.target.value)}
              style={{ width: "100%", background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "12px 12px 12px 45px", color: "black", fontSize: "15px", outline: "none" }}
              required
            />
          </div>
          <button type="submit" style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "10px" }}>
            Login <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </main>
  );
}
