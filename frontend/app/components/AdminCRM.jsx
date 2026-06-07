"use client";

import React, { useState, useEffect } from "react";
import { Users, Search, RefreshCw, CheckCircle, Clock } from "lucide-react";

export default function AdminCRM() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      // Use the correct API URL or fallback to empty string (relative path)
      const res = await fetch("/admin/new-connections");
      const data = await res.json();
      if (data.status === "success") {
        setConnections(data.new_connections);
      }
    } catch (err) {
      console.error("Error fetching connections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  return (
    <div style={{ padding: "20px", color: "white", width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
          <Users size={24} color="#00bcd4" />
          CRM: New Connections
        </h2>
        <button 
          onClick={fetchConnections}
          style={{
            background: "rgba(0, 188, 212, 0.15)",
            border: "1px solid rgba(0, 188, 212, 0.3)",
            color: "#00bcd4",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ 
        background: "rgba(10, 14, 26, 0.6)", 
        border: "1px solid rgba(255,255,255,0.1)", 
        borderRadius: "12px",
        overflow: "hidden"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={{ padding: "16px", fontWeight: "600", color: "#8a99ad" }}>Connection ID</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "#8a99ad" }}>Customer</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "#8a99ad" }}>NIC</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "#8a99ad" }}>Mobile / SLT Number</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "#8a99ad" }}>Package</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "#8a99ad" }}>KYC Status</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "#8a99ad" }}>Provisioning</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: "30px", textAlign: "center", color: "#8a99ad" }}>
                  <RefreshCw className="spin" size={24} style={{ marginBottom: "10px" }} />
                  <br />
                  Loading connections...
                </td>
              </tr>
            ) : connections.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: "30px", textAlign: "center", color: "#8a99ad" }}>
                  No new connections found.
                </td>
              </tr>
            ) : (
              connections.map((conn) => (
                <tr key={conn.connection_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "16px", fontFamily: "monospace", color: "#00bcd4" }}>{conn.connection_id}</td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ fontWeight: "bold" }}>{conn.name}</div>
                    <div style={{ fontSize: "12px", color: "#8a99ad" }}>{conn.address}</div>
                  </td>
                  <td style={{ padding: "16px" }}>{conn.id_number}</td>
                  <td style={{ padding: "16px" }}>
                    <div>{conn.mobile_number}</div>
                    <div style={{ color: "#00e676", fontWeight: "bold", fontSize: "15px" }}>{conn.slt_number}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ 
                      background: "rgba(156, 39, 176, 0.2)", 
                      color: "#e1bee7", 
                      padding: "4px 8px", 
                      borderRadius: "12px",
                      fontSize: "12px"
                    }}>{conn.package}</span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {conn.kyc_status === "Verified" ? (
                      <span style={{ color: "#00e676", display: "flex", alignItems: "center", gap: "4px" }}><CheckCircle size={14} /> Verified</span>
                    ) : (
                      <span style={{ color: "#ffab00", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={14} /> Pending</span>
                    )}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ 
                        background: conn.status === "Provisioned" ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 171, 0, 0.15)", 
                        color: conn.status === "Provisioned" ? "#00e676" : "#ffab00", 
                        padding: "4px 8px", 
                        borderRadius: "4px",
                        fontSize: "12px",
                        border: `1px solid ${conn.status === "Provisioned" ? "rgba(0, 230, 118, 0.3)" : "rgba(255, 171, 0, 0.3)"}`,
                        display: "inline-block",
                        width: "max-content"
                      }}>{conn.status}</span>
                      {conn.dp_loop && (
                        <span style={{ color: "#00bcd4", fontSize: "11px", fontWeight: "bold" }}>
                          📍 {conn.dp_loop}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
