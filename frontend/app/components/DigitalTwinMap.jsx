"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line, Cylinder, Sphere, Box } from "@react-three/drei";
import * as THREE from "three";

// Dummy GIS Data matching Pathfinder details
const dummyPathfinderData = {
  poles: [
    { id: "P-001", type: "Main", position: [0, 0, 0], status: "Active" },
    { id: "P-002", type: "Distribution", position: [5, 0, -5], status: "Active" },
    { id: "P-003", type: "Drop", position: [10, 0, -2], status: "Fault" },
    { id: "P-004", type: "Distribution", position: [-8, 0, 4], status: "Active" },
    { id: "P-005", type: "Main", position: [-3, 0, 10], status: "Maintenance" }
  ],
  manholes: [
    { id: "MH-101", position: [2, -0.5, 3], type: "Primary" },
    { id: "MH-102", position: [-5, -0.5, -6], type: "Secondary" }
  ],
  dps: [
    { id: "DP-FTTH-01", position: [5, 2, -5], capacity: "16/16 Full", type: "Fiber" },
    { id: "DP-FTTH-02", position: [-8, 2, 4], capacity: "8/16 Available", type: "Fiber" },
    { id: "DP-CU-01", position: [0, 2, 0], capacity: "10/50 Available", type: "Copper" }
  ],
  routes: [
    { id: "R-01", path: [[0, 2, 0], [5, 2, -5]], type: "Fiber", status: "Active" },
    { id: "R-02", path: [[5, 2, -5], [10, 2, -2]], type: "Fiber", status: "Fault" },
    { id: "R-03", path: [[0, -0.5, 0], [2, -0.5, 3]], type: "Underground", status: "Active" },
    { id: "R-04", path: [[2, -0.5, 3], [-3, 0, 10]], type: "Underground", status: "Active" },
    { id: "R-05", path: [[0, 2, 0], [-8, 2, 4]], type: "Copper", status: "Active" }
  ]
};

// 3D Components
function Pole({ data, onClick }) {
  const color = data.status === "Fault" ? "#ff3d57" : data.status === "Maintenance" ? "#ffab00" : "#8a99ad";
  return (
    <group position={data.position} onClick={(e) => { e.stopPropagation(); onClick("Pole", data); }}>
      <Cylinder args={[0.1, 0.15, 4, 16]} position={[0, 2, 0]}>
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </Cylinder>
    </group>
  );
}

function Manhole({ data, onClick }) {
  return (
    <group position={data.position} onClick={(e) => { e.stopPropagation(); onClick("Manhole", data); }}>
      <Cylinder args={[0.6, 0.6, 0.1, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#454545" roughness={0.9} />
      </Cylinder>
    </group>
  );
}

function DistributionPoint({ data, onClick }) {
  const color = data.type === "Fiber" ? "#00e676" : "#ff9100";
  return (
    <group position={data.position} onClick={(e) => { e.stopPropagation(); onClick("DP", data); }}>
      <Box args={[0.4, 0.6, 0.3]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </Box>
    </group>
  );
}

function CableRoute({ data, onClick }) {
  const color = data.status === "Fault" ? "#ff3d57" : data.type === "Underground" ? "#607d8b" : data.type === "Fiber" ? "#00bcd4" : "#ff9100";
  const dashed = data.type === "Underground";
  return (
    <Line
      points={data.path}
      color={color}
      lineWidth={data.status === "Fault" ? 4 : 2}
      dashed={dashed}
      dashSize={0.5}
      dashScale={1}
      gapSize={0.2}
      onClick={(e) => { e.stopPropagation(); onClick("Route", data); }}
    />
  );
}

export default function DigitalTwinMap() {
  const [selectedElement, setSelectedElement] = useState(null);

  const handleElementClick = (type, data) => {
    setSelectedElement({ type, ...data });
  };

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "500px", position: "relative", background: "#0a0e1a", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0, 188, 212, 0.3)" }}>
      
      {/* 3D Canvas */}
      <Canvas camera={{ position: [15, 10, 15], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} />
        <pointLight position={[-10, 5, -10]} intensity={0.8} color="#00bcd4" />
        
        {/* Ground Grid */}
        <gridHelper args={[50, 50, "#00bcd4", "#2a3b5c"]} position={[0, -0.5, 0]} />
        
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />

        {/* Render Infrastructure */}
        {dummyPathfinderData.poles.map((p) => (
          <Pole key={p.id} data={p} onClick={handleElementClick} />
        ))}
        {dummyPathfinderData.manholes.map((m) => (
          <Manhole key={m.id} data={m} onClick={handleElementClick} />
        ))}
        {dummyPathfinderData.dps.map((d) => (
          <DistributionPoint key={d.id} data={d} onClick={handleElementClick} />
        ))}
        {dummyPathfinderData.routes.map((r) => (
          <CableRoute key={r.id} data={r} onClick={handleElementClick} />
        ))}
      </Canvas>

      {/* Overlay UI */}
      <div style={{ position: "absolute", top: 15, left: 15, zIndex: 10 }}>
        <h2 style={{ color: "white", margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#00bcd4", borderRadius: "50%", boxShadow: "0 0 10px #00bcd4" }}></span>
          Pathfinder Digital Twin
        </h2>
        <p style={{ color: "#8a99ad", fontSize: "12px", margin: "4px 0 0 0" }}>Live 3D Infrastructure Map (Pitipana Zone)</p>
      </div>

      {/* Details Panel */}
      {selectedElement && (
        <div style={{ 
          position: "absolute", 
          bottom: 20, 
          right: 20, 
          background: "rgba(10, 14, 26, 0.85)", 
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0, 188, 212, 0.4)",
          padding: "15px",
          borderRadius: "8px",
          color: "white",
          minWidth: "220px",
          zIndex: 10
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "5px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", color: "#00bcd4" }}>{selectedElement.type} Details</h3>
            <button 
              onClick={() => setSelectedElement(null)}
              style={{ background: "none", border: "none", color: "#8a99ad", cursor: "pointer", fontSize: "16px" }}
            >×</button>
          </div>
          <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ margin: 0 }}><strong>ID:</strong> {selectedElement.id}</p>
            {selectedElement.status && (
              <p style={{ margin: 0 }}><strong>Status:</strong> <span style={{ color: selectedElement.status === "Fault" ? "#ff3d57" : "#00e676" }}>{selectedElement.status}</span></p>
            )}
            {selectedElement.capacity && (
              <p style={{ margin: 0 }}><strong>Capacity:</strong> {selectedElement.capacity}</p>
            )}
            {selectedElement.type && selectedElement.type !== selectedElement.type && (
               <p style={{ margin: 0 }}><strong>Category:</strong> {selectedElement.type}</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        background: "rgba(10, 14, 26, 0.6)",
        padding: "10px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.1)",
        fontSize: "11px",
        color: "#8a99ad",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "12px", height: "3px", background: "#00bcd4" }}></div> Active Fiber Route</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "12px", height: "3px", background: "#ff3d57" }}></div> Fault Route</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "12px", height: "3px", background: "#607d8b", borderTop: "1px dashed #fff" }}></div> Underground Route</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "8px", height: "8px", background: "#00e676" }}></div> Fiber DP</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "8px", height: "8px", background: "#ff9100" }}></div> Copper DP</div>
      </div>
    </div>
  );
}
