// @ts-nocheck
'use client';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw, Layers, Orbit, Play, Pause, Clock, AlertTriangle, ZoomIn, CloudLightning, Network, Activity, Eye, EyeOff } from 'lucide-react';
import { NetworkNode, Connection } from '../types';
import { HISTORICAL_TIMELINE } from '../historicalData';

// Anchor center coordinates derived from typical central telemetry or averaged from nodes.
// If the list is empty, default values are used.
const DEFAULT_CENTER_LAT = 6.8410;
const DEFAULT_CENTER_LON = 80.0035;
const SCALE_COEFF = 600; // Multiplier to turn fractional GIS degrees into meaningful 3D space units

// Subtle rolling terrain elevation function representing the physical topography of Homagama
export const getTerrainElevation = (x: number, z: number) => {
  // Homagama varying physical topography simulation using multiple wave profiles
  const wave1 = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.95;
  const wave2 = Math.cos(x * 0.16 + z * 0.05) * 0.35;
  const wave3 = Math.sin(x * 0.3) * Math.sin(z * 0.3) * 0.12;
  return wave1 + wave2 + wave3;
};

/**
 * Calculates the geodetic distance in meters between two points using the Haversine formula
 */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Earth's radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
}

/**
 * Tracing the entire connected path of the same type ('fiber' | 'copper')
 * starting from the hovered node.
 */
export function getConnectedPaths(hoveredNodeId: string | null, connections: Connection[]): Set<string> {
  const connected = new Set<string>();
  if (!hoveredNodeId) return connected;

  // Find all direct connections from the hovered node
  const directConns = connections.filter(c => c.from === hoveredNodeId || c.to === hoveredNodeId);
  if (directConns.length === 0) return connected;

  // Get unique connection types that are directly connected to this node
  const connectionTypes = Array.from(new Set(directConns.map(c => c.type)));

  connectionTypes.forEach(type => {
    // BFS to find the connected component of 'type' containing hoveredNodeId
    const visited = new Set<string>([hoveredNodeId]);
    const queue = [hoveredNodeId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      connections.forEach(conn => {
        if (conn.type === type) {
          if (conn.from === curr && !visited.has(conn.to)) {
            visited.add(conn.to);
            queue.push(conn.to);
            connected.add(`${conn.from}-${conn.to}`);
            connected.add(`${conn.to}-${conn.from}`);
          } else if (conn.to === curr && !visited.has(conn.from)) {
            visited.add(conn.from);
            queue.push(conn.from);
            connected.add(`${conn.from}-${conn.to}`);
            connected.add(`${conn.to}-${conn.from}`);
          }
        }
      });
    }
  });

  return connected;
}

// Custom scanning radar shader definition for visualizing broadcast coverage around selected node
const RADAR_SHADER = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float uTime;
    void main() {
      vec2 uv = vUv - vec2(0.5);
      float dist = length(uv);
      if (dist > 0.5) {
        discard;
      }
      
      // Calculate angle of current pixel: -PI to PI
      float angle = atan(uv.y, uv.x);
      if (angle < 0.0) {
        angle += 6.28318530718;
      }
      
      // Rotation offset based on time (slow sweep rotation speed)
      float rotation = mod(uTime * 1.4, 6.28318530718);
      
      // Find diff in angle between rotation sweep line and pixel angle
      float diff = rotation - angle;
      if (diff < 0.0) {
        diff += 6.28318530718;
      }
      
      // Decay of trail (the sweep line has value 1.0, and trails off towards 0)
      float sweep = 1.0 - (diff / 6.28318530718);
      sweep = pow(sweep, 4.0);
      
      // Soft outer edge limit
      float radialLimit = smoothstep(0.5, 0.45, dist);
      
      // Concentric structural range rings inside signal broadcast area
      float ringIntensity = 0.0;
      float r1 = abs(dist - 0.16);
      float r2 = abs(dist - 0.33);
      float r3 = abs(dist - 0.48);
      if (r1 < 0.005) ringIntensity += (1.0 - r1/0.005) * 0.45;
      if (r2 < 0.005) ringIntensity += (1.0 - r2/0.005) * 0.45;
      if (r3 < 0.004) ringIntensity += (1.0 - r3/0.004) * 0.85;
      
      // Fine circular ticks around outer boundary ring
      float outerTicks = 0.0;
      if (dist > 0.45 && dist < 0.47) {
        float angleTick = mod(angle * 24.0, 6.28318530718);
        if (angleTick < 0.08) {
          outerTicks = 0.7;
        }
      }
      
      // Crosshairs/compass grid lines matching precise network infrastructure visuals
      float crosshair = 0.0;
      if (abs(uv.x) < 0.0015 && dist < 0.48) crosshair += 0.4;
      if (abs(uv.y) < 0.0015 && dist < 0.48) crosshair += 0.4;
      
      // Sharp sweeping sweep line
      float sweepLine = 0.0;
      if (diff < 0.012 && dist < 0.48) {
        sweepLine = 1.0 - (diff / 0.012);
      }
      
      // Base premium network cyan/teal theme color spectrum
      vec3 baseColor = vec3(0.06, 0.71, 0.83); // #06b6d4
      
      float alpha = (sweep * 0.5 + ringIntensity * 0.4 + outerTicks * 0.45 + crosshair * 0.12 + sweepLine * 0.8) * radialLimit;
      vec3 finalColor = baseColor * (sweep * 1.8 + ringIntensity * 1.5 + outerTicks * 1.3 + crosshair * 0.6 + sweepLine * 2.5 + 0.1);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

/**
 * Procedural Node Mesh Component
 * Represents either a Pole or a Distribution Point (DP) on the GIS plane.
 * Utilizes useFrame to animate emitting intensity (glowing/pulsing) in active fault status.
 */
interface NodeMeshProps {
  node: NetworkNode;
  position: [number, number, number];
  isSelected: boolean;
  isProximate?: boolean;
  proximityDistance?: number;
  onSelect: (node: NetworkNode) => void;
  geoZoomEnabled: boolean;
  labelOffset?: number;
  clutterScore?: number;
  radarSpeed?: number;
}

function NodeMesh({ node, position, isSelected, isProximate, proximityDistance, onSelect, geoZoomEnabled, labelOffset = 0, clutterScore = 0, radarSpeed = 1.0 }: NodeMeshProps) {
  const poleMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const dpMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const radarShaderRef = useRef<THREE.ShaderMaterial>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const nodeGroupRef = useRef<THREE.Group>(null);
  
  const isSelectedNode = isSelected;
  const isFaulty = node.status === 'fault';
  const isGroundNode = node.type === 'msan' || node.type === 'cabinet';
  const labelY = node.type === 'msan' 
    ? 0.75 
    : (node.type === 'cabinet' 
        ? 1.85 
        : (node.type === 'dp' ? 2.3 : 2.05));
  const faultY = node.type === 'msan' 
    ? 0.35 
    : (node.type === 'cabinet' 
        ? 1.4 
        : (node.type === 'dp' ? 1.9 : 2.02));

  // Blinking alarm animation + Dynamic Zoom density calculation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // 1. Zoom Density calculations (on all nodes!)
    const camera = state.camera;
    const nodeWorldPos = new THREE.Vector3(...position);
    const distance = camera.position.distanceTo(nodeWorldPos);

    if (geoZoomEnabled) {
      let showLabel = false;
      let labelOpacity = 0;
      let labelScale = 0.85;

      if (isSelectedNode || isFaulty) {
        showLabel = true;
        labelOpacity = 1;
        labelScale = 1;
      } else if (distance < 11) {
        showLabel = true;
        labelOpacity = 0.95;
        labelScale = 0.95;
      } else if (distance < 19) {
        if (node.type === 'dp' || isProximate) {
          showLabel = true;
          const fadeT = (19 - distance) / 8;
          labelOpacity = Math.max(0, fadeT * 0.9);
          labelScale = 0.85 + fadeT * 0.1;
        }
      }

      if (labelRef.current) {
        if (showLabel && labelOpacity > 0.05) {
          labelRef.current.style.opacity = String(labelOpacity);
          labelRef.current.style.transform = `scale(${labelScale})`;
          labelRef.current.style.pointerEvents = 'auto';
          labelRef.current.style.display = 'flex';
        } else {
          labelRef.current.style.opacity = '0';
          labelRef.current.style.transform = 'scale(0.75)';
          labelRef.current.style.pointerEvents = 'none';
          labelRef.current.style.display = 'none';
        }
      }

      // Hide or shrink minor poles based on view distance (density)
      const isMinorPole = node.type === 'pole' && !isSelectedNode && !isFaulty && !isProximate;
      if (isMinorPole) {
        if (nodeGroupRef.current) {
          if (distance > 21) {
            nodeGroupRef.current.visible = false;
          } else {
            nodeGroupRef.current.visible = true;
            if (distance > 12) {
              const shrinkT = (21 - distance) / 9;
              nodeGroupRef.current.scale.set(shrinkT, shrinkT, shrinkT);
            } else {
              nodeGroupRef.current.scale.set(1, 1, 1);
            }
          }
        }
      } else {
        if (nodeGroupRef.current) {
          nodeGroupRef.current.visible = true;
          nodeGroupRef.current.scale.set(1, 1, 1);
        }
      }
    } else {
      // Zoom mode disabled: keep everything fully visible with basic styles
      if (labelRef.current) {
        labelRef.current.style.opacity = '0.9';
        labelRef.current.style.transform = 'scale(1)';
        labelRef.current.style.pointerEvents = 'auto';
        labelRef.current.style.display = 'flex';
      }
      if (nodeGroupRef.current) {
        nodeGroupRef.current.visible = true;
        nodeGroupRef.current.scale.set(1, 1, 1);
      }
    }

    // 2. Dynamically update custom signal sweep radar shader state
    if (radarShaderRef.current) {
      radarShaderRef.current.uniforms.uTime.value = time * radarSpeed;
    }

    // 3. Status pulsing and animations
    if (!isFaulty) {
      if (poleMatRef.current) {
        poleMatRef.current.emissiveIntensity = 0;
        poleMatRef.current.emissive.setHex(0x000000);
      }
      if (dpMatRef.current) {
        dpMatRef.current.emissiveIntensity = 0;
        dpMatRef.current.emissive.setHex(0x000000);
        const c = node.type === 'dp' 
          ? '#06b6d4' 
          : (node.type === 'msan' 
              ? '#f97316' 
              : (node.type === 'cabinet' 
                  ? '#cbd5e1' 
                  : '#64748b'));
        dpMatRef.current.color.set(c);
      }
    } else {
      const pulseFactor = (Math.sin(time * 8) + 1) / 2;
      if (poleMatRef.current) {
        poleMatRef.current.emissive.setRGB(pulseFactor * 0.4, 0, 0);
        poleMatRef.current.emissiveIntensity = pulseFactor * 1.2;
      }
      if (dpMatRef.current) {
        dpMatRef.current.color.setRGB(0.3 + pulseFactor * 0.7, 0.0, 0.05);
        dpMatRef.current.emissive.setRGB(pulseFactor * 1.5, 0, 0.05);
        dpMatRef.current.emissiveIntensity = pulseFactor * 2.5;
      }
      if (pulseRingRef.current) {
        const ringScale = 0.5 + ((time * 1.8) % 2.5);
        pulseRingRef.current.scale.set(ringScale, ringScale, 1);
        const material = pulseRingRef.current.material as THREE.MeshBasicMaterial;
        if (material) {
          material.opacity = Math.max(0, 1 - (ringScale / 3.0)) * 0.6;
        }
      }
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect(node);
  };

  return (
    <group ref={nodeGroupRef} position={position} onPointerDown={handlePointerDown}>
      {/* 1. Tall Cylinder Pole (Y: 0 to 2) */}
      {!isGroundNode && (
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.07, 2.0, 12]} />
          <meshStandardMaterial
            ref={poleMatRef}
            color="#1e293b" // Slate dark-gray body
            roughness={0.4}
            metalness={0.8}
          />
        </mesh>
      )}

      {/* 2. Pole Cap or DP Module at Top (Y: ~1.9) */}
      {!isGroundNode && (node.type === 'dp' ? (
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <meshStandardMaterial
            ref={dpMatRef}
            color={isFaulty ? "#ef4444" : "#06b6d4"} // Red for fault, Cyan for fiber distribution pole
            roughness={0.2}
            metalness={0.9}
            emissive={isFaulty ? "#ef4444" : "#22d3ee"}
            emissiveIntensity={isFaulty ? 1.0 : 0.15}
          />
        </mesh>
      ) : (
        <mesh position={[0, 2.02, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial
            ref={dpMatRef}
            color="#475569" // Calm neutral gray cap
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      ))}

      {/* MSAN Node Mesh (Simple white ground box/cabinet as requested) */}
      {node.type === 'msan' && (
        <group position={[0, 0.3, 0]}>
          {/* Metallic clean white plinth/box as requested */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.6, 0.48]} />
            <meshStandardMaterial
              ref={dpMatRef}
              color="#f8fafc" // Clean white box
              roughness={0.15}
              metalness={0.3}
              emissive={isFaulty ? "#ef4444" : "#ffffff"}
              emissiveIntensity={isFaulty ? 1.0 : 0.05}
            />
          </mesh>
          {/* Subtle metal frame/rim for realism */}
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[0.52, 0.05, 0.52]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Small status LED indicator in the front */}
          <mesh position={[0, 0.18, 0.245]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color={isFaulty ? "#ef4444" : "#10b981"} />
          </mesh>
        </group>
      )}

      {/* FTTH Cabinet Node Mesh (Kanu uda thina box - box mounted on pole as requested) */}
      {node.type === 'cabinet' && (
        <group position={[0, 0, 0]}>
          {/* The supporting Pole/Kanu underneath (Y: 0 to 1.1) */}
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.1, 10]} />
            <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* The box on top (Y: 1.1 to 1.7) */}
          <group position={[0, 1.4, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.38, 0.55, 0.32]} />
              <meshStandardMaterial
                ref={dpMatRef}
                color="#cbd5e1" // cool grey outdoor cabinet box
                roughness={0.2}
                metalness={0.5}
                emissive={isFaulty ? "#ef4444" : "#0f172a"}
                emissiveIntensity={isFaulty ? 0.9 : 0.05}
              />
            </mesh>
            {/* Box rain roof */}
            <mesh position={[0, 0.28, 0]} castShadow>
              <boxGeometry args={[0.42, 0.03, 0.36]} />
              <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Tiny locking latch / detail */}
            <mesh position={[0, -0.1, 0.162]} castShadow>
              <boxGeometry args={[0.02, 0.1, 0.015]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Dynamic Status pulse node indicator lamp */}
            <mesh position={[0, 0.18, 0.162]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color={isFaulty ? "#ef4444" : "#10b981"} />
            </mesh>
          </group>
        </group>
      )}

      {/* 3. Sweeping circular radar coverage scan overlay & ring */}
      {isSelectedNode && (
        <group>
          {/* Signal sweep plane representing live broadcast coverage range */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <planeGeometry args={[5.2, 5.2]} />
            <shaderMaterial
              ref={radarShaderRef}
              vertexShader={RADAR_SHADER.vertexShader}
              fragmentShader={RADAR_SHADER.fragmentShader}
              transparent={true}
              depthWrite={false}
              uniforms={useMemo(() => ({
                uTime: { value: 0 }
              }), [])}
            />
          </mesh>

          {/* Sharp inner focal cursor ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <ringGeometry args={[0.4, 0.44, 32]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        </group>
      )}

      {/* 4. Blinking alarm hazard ring expanding outwards */}
      {isFaulty && (
        <mesh ref={pulseRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.1, 1.2, 32]} />
          <meshBasicMaterial color="#f43f5e" transparent={true} opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 5. 2D/3D Hybrid CSS Pulse Node Indicator Overlay */}
      {isFaulty && (
        <Html position={[0, faultY, 0]} center distanceFactor={15}>
          <div className="relative flex items-center justify-center w-12 h-12 pointer-events-none select-none">
            {/* Custom glowing radar wave styled in CSS */}
            <div className="absolute w-12 h-12 rounded-full border-2 border-rose-500/50 bg-rose-500/10 fault-radar-wave" />
            {/* Core center pulse glowing light and warning label */}
            <div className="absolute w-6 h-6 rounded-full border border-rose-400 bg-rose-600/95 fault-glow-core flex items-center justify-center shadow-lg shadow-rose-500/50 cursor-pointer pointer-events-auto" title={`High Attenuation Fault Alert: ${node.label || node.id}`} onClick={handlePointerDown}>
              <span className="text-[10px] font-black font-sans text-slate-100 leading-none">!</span>
            </div>
          </div>
        </Html>
      )}

      {/* 6. Proximity Maintenance Indicator Ring & Distance tag */}
      {isProximate && (
        <group>
          {/* Flat soft glow ring on ground terrain */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.26, 0.32, 16]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.65} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <ringGeometry args={[0.0, 0.25, 16]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.12} />
          </mesh>
          {/* Floating tiny geodetic spacing tag */}
          <Html position={[0, labelY + labelOffset, 0]} center distanceFactor={14}>
            <div className="px-1.5 py-0.5 bg-slate-900/90 border border-sky-450/40 rounded text-[7.5px] font-mono text-sky-400 font-bold tracking-tight whitespace-nowrap shadow-md shadow-black/80 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-sky-400 animate-pulse inline-block" />
              <span>{proximityDistance ? `${proximityDistance.toFixed(0)}m` : 'PROX'}</span>
            </div>
          </Html>
        </group>
      )}

      {/* 7. Dynamic High-Fidelity Floating Labels with Auto-Zoom capability */}
      <Html position={[0, labelY + labelOffset, 0]} center distanceFactor={14}>
        <div
          ref={labelRef}
          className="flex flex-col items-center pointer-events-none transition-all duration-300"
        >
          <div 
            className="px-1.5 py-0.5 border rounded font-mono text-[8px] text-white select-none whitespace-nowrap flex items-center gap-1 transition-all duration-300"
            style={{
              backgroundColor: `rgba(2, 6, 23, ${Math.min(1.0, 0.75 + (clutterScore + (labelOffset > 0 ? 1 : 0)) * 0.12)})`,
              borderColor: (clutterScore > 0 || labelOffset > 0)
                ? 'rgba(74, 85, 104, 0.95)' // High contrast slate-600 border for legibility against terrain
                : 'rgba(30, 41, 59, 0.85)', // Standard subtle slate-800 border
              boxShadow: (clutterScore > 0 || labelOffset > 0)
                ? '0 4px 12px rgba(0, 0, 0, 0.95), 0 0 6px rgba(6, 182, 212, 0.15)' // Deeper shadows and thin glow during clutter
                : '0 2px 4px rgba(0, 0, 0, 0.7)'
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${node.type === 'dp' ? 'bg-[#06b6d4]' : (node.type === 'msan' ? 'bg-[#f4511e]' : (node.type === 'cabinet' ? 'bg-[#94a3b8]' : 'bg-[#64748b]'))} ${isFaulty ? 'bg-[#ef4444] animate-pulse' : ''}`} />
            <span className={`${isFaulty ? 'text-[#f43f5e] font-extrabold' : 'text-slate-350'}`}>
              {node.label ? node.label.replace('HO-HTN-', '').replace('SL-MSAN-', '').replace('SL-CAB-', '') : node.id}
            </span>
            {node.type === 'dp' && <span className="text-[6.5px] text-[#06b6d4] font-black uppercase font-mono px-0.5 py-0 bg-cyan-950/30 rounded border border-cyan-800/20">DP</span>}
            {node.type === 'msan' && <span className="text-[6.5px] text-orange-400 font-black uppercase font-mono px-0.5 py-0 bg-orange-950/30 rounded border border-orange-800/20">MSAN</span>}
            {node.type === 'cabinet' && <span className="text-[6.5px] text-slate-300 font-black uppercase font-mono px-0.5 py-0 bg-slate-950/30 rounded border border-slate-700/20">CAB</span>}
          </div>
          {/* Vertical stem connector line for stacked labels */}
          {labelOffset > 0 && (
            <div 
              className="w-[1.5px] bg-gradient-to-t from-[#06b6d4]/50 to-slate-800/20" 
              style={{ height: `${Math.min(100, labelOffset * 40)}px`, marginTop: '2px' }} 
            />
          )}
        </div>
      </Html>
    </group>
  );
}

/**
 * Drooping Cable Component
 * Connects poles procedurally using quadratic Bezier curve to represent heavy copper or fiber runs drooping naturally.
 * Rendered using THREE.Line primitive to bypass React 19 / SVG TS namespace collisions.
 */
interface TransmissionParticlesProps {
  curve: THREE.Curve<THREE.Vector3>;
  type?: 'fiber' | 'copper';
  isLineAlarmed: boolean;
}

function TransmissionParticles({ curve, type = 'fiber', isLineAlarmed }: TransmissionParticlesProps) {
  const isFiber = type === 'fiber';
  const particleCount = isFiber ? 3 : 2;
  const particleRefs = useRef<(THREE.Mesh | null)[]>([]);
  
  // Fiber features ultra-high-speed (1.4), copper is traditional slower speed (0.6)
  const speed = isFiber ? 1.4 : 0.6;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    for (let i = 0; i < particleCount; i++) {
      const mesh = particleRefs.current[i];
      if (!mesh) continue;
      
      let t;
      if (isFiber) {
        // Unidirectional cascade forward stream
        t = (time * speed + (i * 0.33)) % 1.0;
      } else {
        // Bidirectional transport (one forward, one backward)
        if (i === 1) {
          t = 1.0 - ((time * speed + 0.5) % 1.0);
        } else {
          t = (time * speed) % 1.0;
        }
      }
      
      const point = curve.getPointAt(t);
      mesh.position.copy(point);
    }
  });

  const color = isLineAlarmed 
    ? '#ef4444' 
    : isFiber 
      ? '#06b6d4' // beautiful glowing cyan
      : '#fbbf24'; // bright electric amber

  const size = isFiber ? 0.055 : 0.045;

  return (
    <group>
      {Array.from({ length: particleCount }).map((_, idx) => (
        <mesh 
          key={idx} 
          ref={(el) => { particleRefs.current[idx] = el; }}
        >
          <sphereGeometry args={[size, 6, 6]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.9} 
          />
        </mesh>
      ))}
    </group>
  );
}

interface CableProps {
  fromPos: [number, number, number];
  toPos: [number, number, number];
  fromFault: boolean;
  toFault: boolean;
  isHighlighted?: boolean;
  type?: 'fiber' | 'copper';
  isTopologyOverviewActive?: boolean;
  segmentHeatmapActive?: boolean;
  isWeatherActive?: boolean;
  windSpeed?: number;
  fromId: string;
  toId: string;
  isRoad?: boolean;
}

function Cable({
  fromPos,
  toPos,
  fromFault,
  toFault,
  isHighlighted,
  type,
  isTopologyOverviewActive,
  segmentHeatmapActive,
  isWeatherActive,
  windSpeed = 45,
  fromId,
  toId,
  isRoad = false
}: CableProps) {
  // Generate curve/road-path points
  const curvePoints = useMemo(() => {
    if (isRoad) {
      const points: THREE.Vector3[] = [];
      const steps = 15;
      
      // Corner point of the L-shape road
      const cornerX = toPos[0];
      const cornerZ = fromPos[2];

      // Segment 1: fromX to cornerX (moving along X axis)
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = fromPos[0] + (cornerX - fromPos[0]) * t;
        const z = fromPos[2];
        const y = getTerrainElevation(x, z) + 0.06; // sit slightly above ground
        points.push(new THREE.Vector3(x, y, z));
      }

      // Segment 2: cornerZ to toZ (moving along Z axis)
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = cornerX;
        const z = fromPos[2] + (toPos[2] - fromPos[2]) * t;
        const y = getTerrainElevation(x, z) + 0.06;
        points.push(new THREE.Vector3(x, y, z));
      }

      // Deduplicate consecutive points to prevent division by zero in CatmullRomCurve3 / TubeGeometry Frenet frames
      const uniquePoints: THREE.Vector3[] = [];
      for (const p of points) {
        if (uniquePoints.length === 0) {
          uniquePoints.push(p);
        } else {
          const last = uniquePoints[uniquePoints.length - 1];
          if (p.distanceTo(last) > 0.001) {
            uniquePoints.push(p);
          }
        }
      }

      // Ensure at least 2 points
      if (uniquePoints.length < 2) {
        return [
          new THREE.Vector3(fromPos[0], getTerrainElevation(fromPos[0], fromPos[2]) + 0.06, fromPos[2]),
          new THREE.Vector3(toPos[0], getTerrainElevation(toPos[0], toPos[2]) + 0.06, toPos[2])
        ];
      }

      return uniquePoints;
    } else {
      // standard aerial curved wire with sag
      const start = new THREE.Vector3(fromPos[0], 1.9, fromPos[2]);
      const end = new THREE.Vector3(toPos[0], 1.9, toPos[2]);
      const midpointY = Math.min(start.y, end.y) - 0.22;
      const controlPoint = new THREE.Vector3(
        (start.x + end.x) / 2,
        midpointY,
        (start.z + end.z) / 2
      );
      const curveObj = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
      return curveObj.getPoints(16);
    }
  }, [fromPos, toPos, isRoad]);

  // Compute curve object for particles dynamic pathing
  const curveObj = useMemo(() => {
    if (isRoad) {
      return new THREE.CatmullRomCurve3(curvePoints);
    } else {
      const start = new THREE.Vector3(fromPos[0], 1.9, fromPos[2]);
      const end = new THREE.Vector3(toPos[0], 1.9, toPos[2]);
      const midpointY = Math.min(start.y, end.y) - 0.22;
      const controlPoint = new THREE.Vector3(
        (start.x + end.x) / 2,
        midpointY,
        (start.z + end.z) / 2
      );
      return new THREE.QuadraticBezierCurve3(start, controlPoint, end);
    }
  }, [fromPos, toPos, isRoad, curvePoints]);

  const jointGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curvePoints), [curvePoints]);
  
  // Calculate dynamic signal strength percentage for this specific physical link
  const signalStrength = useMemo(() => {
    let strength = type === 'fiber' ? 97 : 86;
    const dx = fromPos[0] - toPos[0];
    const dz = fromPos[2] - toPos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    // Deduct attenuation proportional to physical distance
    strength -= dist * 0.45;

    // Severe Storm Rainfade attenuation (high-fidelity scaling)
    if (isWeatherActive) {
      if (type === 'copper') {
        strength -= (windSpeed * 0.15) + 12; // copper severely degraded by water/aerial storm
      } else {
        strength -= (windSpeed * 0.04) + 4;  // fiber rainfade is comparatively mild
      }
    }

    // Node failure penalty
    if (fromFault || toFault) {
      strength = Math.max(5, strength * 0.15); // catastrophic loss
    }

    // Add high realism jitter/fluctuation based on keys
    const code = (fromId.charCodeAt(fromId.length - 1) || 5) + (toId.charCodeAt(toId.length - 1) || 8);
    const wiggle = Math.sin(code) * 1.5;
    strength += wiggle;

    return Math.max(2, Math.min(100, Math.round(strength)));
  }, [fromPos, toPos, fromFault, toFault, type, isWeatherActive, windSpeed, fromId, toId]);

  // Determine signal heatmap colors
  const signalColor = useMemo(() => {
    if (signalStrength >= 80) return '#10b981'; // Emerald Green
    if (signalStrength >= 45) return '#f59e0b'; // Amber Warning
    return '#f43f5e'; // Crimson Critical
  }, [signalStrength]);

  // If either of the connected poles is faulted, the line displays an amber/red hazard look
  const isLineAlarmed = fromFault || toFault;

  const lineMaterial = useMemo(() => {
    let colorHex = isLineAlarmed ? "#ef4444" : (isRoad ? "#efebdb" : "#14b8a6"); // neat bright street-color roads, cyan overhead cables
    let opacityValue = isLineAlarmed ? 0.9 : (isRoad ? 0.8 : 0.4);

    if (segmentHeatmapActive) {
      colorHex = signalColor;
      opacityValue = 0.85;
    }

    return new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: opacityValue,
      linewidth: isRoad ? 4.0 : 2.5
    });
  }, [isLineAlarmed, segmentHeatmapActive, signalColor, isRoad]);

  // Animated data flow pulse reference
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseSpeed = useMemo(() => 0.45 + Math.random() * 0.3, []);
  const pulseOffset = useMemo(() => Math.random() * Math.PI, []);

  const linePrimitive = useMemo(() => {
    return new THREE.Line(jointGeometry, lineMaterial);
  }, [jointGeometry, lineMaterial]);

  useFrame((state) => {
    if (!pulseRef.current) return;
    const time = state.clock.getElapsedTime();
    // Progress loop from 0 to 1 with slight offset so they don't sync up roboticly
    const t = (time * pulseSpeed + pulseOffset) % 1.0;
    const point = curveObj.getPointAt(t);
    pulseRef.current.position.copy(point);
  });

  const pulseColor = segmentHeatmapActive 
    ? signalColor 
    : isLineAlarmed 
      ? "#ef4444" 
      : isHighlighted 
        ? (type === 'fiber' ? "#38bdf8" : "#fbbf24") 
        : (isRoad ? "#fbbf24" : "#38bdf8"); // golden/yellow packet pulse for ground roads

  return (
    <group>
      {isHighlighted ? (
        <mesh>
          <tubeGeometry args={[curveObj, 32, isRoad ? 0.05 : 0.08, 8, false]} />
          <meshBasicMaterial
            color={segmentHeatmapActive ? signalColor : (isLineAlarmed ? "#ef4444" : (type === 'fiber' ? "#38bdf8" : "#fbbf24"))}
            transparent
            opacity={0.95}
          />
        </mesh>
      ) : (
        <primitive object={linePrimitive} />
      )}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[isLineAlarmed ? 0.08 : isHighlighted ? 0.12 : 0.06, 8, 8]} />
        <meshBasicMaterial
          color={pulseColor}
          transparent
          opacity={isLineAlarmed ? 0.95 : isHighlighted ? 1.0 : 0.85}
        />
      </mesh>

      {/* Topology Overview Data Transmissions Overlay Particles */}
      {isTopologyOverviewActive && (
        <TransmissionParticles 
          curve={curveObj} 
          type={type} 
          isLineAlarmed={isLineAlarmed} 
        />
      )}
    </group>
  );
}

interface TerrainElevationProps {
  size?: number;
  segments?: number;
}

function TerrainElevation({ size = 60, segments = 40 }: TerrainElevationProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const posAttr = geo.attributes.position;
    
    const colors = [];
    const colorLow = new THREE.Color('#030712'); // very dark background
    const colorHigh = new THREE.Color('#134e4a'); // subtle deep teal highlight at peaks
    
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const height = getTerrainElevation(x, -y);
      posAttr.setZ(i, height);
      
      const t = Math.max(0, Math.min(1, (height + 1.2) / 2.7));
      const vertexColor = colorLow.clone().lerp(colorHigh, t * 0.45);
      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }
    
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [size, segments]);

  return (
    <group>
      {/* 3D low-poly style solid terrain surface */}
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <meshStandardMaterial
          vertexColors={true}
          roughness={0.8}
          metalness={0.15}
          flatShading={true}
        />
      </mesh>

      {/* Futuristic cyan-toned digital twin mesh grid overlay */}
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <meshBasicMaterial
          color="#14b8a6"
          wireframe={true}
          transparent={true}
          opacity={0.15}
        />
      </mesh>
    </group>
  );
}

function StormWindTrails({ windSpeed, windDirection, isActive }: { windSpeed: number; windDirection: string; isActive: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 55;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = Math.random() * 5 + 0.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, []);

  const windVector = useMemo(() => {
    const dir = windDirection.toUpperCase();
    let dx = 0, dz = 0;
    if (dir.includes('N')) dz = -1;
    if (dir.includes('S')) dz = 1;
    if (dir.includes('E')) dx = 1;
    if (dir.includes('W')) dx = -1;

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }
    return { x: dx, z: dz };
  }, [windDirection]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !isActive) return;
    const positionsArr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const speedFactor = (windSpeed / 3.6) * 0.18; // conversion helper

    for (let i = 0; i < count; i++) {
      positionsArr[i * 3] += windVector.x * speedFactor * delta;
      positionsArr[i * 3 + 2] += windVector.z * speedFactor * delta;
      positionsArr[i * 3 + 1] += Math.sin(state.clock.getElapsedTime() * 4.0 + i) * 0.008;

      // Wrap around grid boundaries [-25, 25] bounds
      if (positionsArr[i * 3] > 25) positionsArr[i * 3] = -25;
      if (positionsArr[i * 3] < -25) positionsArr[i * 3] = 25;
      if (positionsArr[i * 3 + 2] > 25) positionsArr[i * 3 + 2] = -25;
      if (positionsArr[i * 3 + 2] < -25) positionsArr[i * 3 + 2] = 25;
      if (positionsArr[i * 3 + 1] > 6.0) positionsArr[i * 3 + 1] = 0.8;
      if (positionsArr[i * 3 + 1] < 0.4) positionsArr[i * 3 + 1] = 5.5;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!isActive) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#38bdf8"
        size={0.16}
        transparent
        opacity={0.32}
        depthWrite={false}
      />
    </points>
  );
}

function SignalWaveMesh({ position, isFault }: { position: [number, number, number]; isFault: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const time = state.clock.getElapsedTime();
    const cycle = (time * 0.5) % 1.0;
    
    const scale = cycle * 4.8;
    ringRef.current.scale.set(scale, scale, 1);
    
    if (ringRef.current.material) {
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1.0 - cycle) * 0.35);
    }
  });

  const color = isFault ? "#f43f5e" : "#06b6d4";

  return (
    <mesh
      ref={ringRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[position[0], position[1] + 0.015, position[2]]}
    >
      <ringGeometry args={[0.01, 0.42, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Map Scene Assembly inside Canvas context
 */
interface MapSceneProps {
  nodes: NetworkNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  onSelectNode: (node: NetworkNode | null) => void;
  centerLat: number;
  centerLon: number;
  resetKey: number;
  heatmapActive: boolean;
  orbitActive: boolean;
  hoveredNodeId: string | null;
  geoZoomEnabled: boolean;
  radarSpeed?: number;
  isTopologyOverviewActive?: boolean;
  cameraPreset: string;
  windSpeed: number;
  windDirection: string;
  isWeatherActive: boolean;
  signalLayerActive: boolean;
  segmentHeatmapActive: boolean;
  localToSvgCoords: (lx: number, lz: number) => { x: number, y: number };
}

function MapScene({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  centerLat,
  centerLon,
  resetKey,
  heatmapActive,
  orbitActive,
  hoveredNodeId,
  geoZoomEnabled,
  radarSpeed = 1.0,
  isTopologyOverviewActive = true,
  cameraPreset,
  windSpeed,
  windDirection,
  isWeatherActive,
  signalLayerActive,
  segmentHeatmapActive,
  localToSvgCoords
}: MapSceneProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const localToSvgCoordsRef = useRef(localToSvgCoords);
  useEffect(() => {
    localToSvgCoordsRef.current = localToSvgCoords;
  }, [localToSvgCoords]);

  const highlightedConnectionKeys = useMemo(() => {
    return getConnectedPaths(hoveredNodeId, connections);
  }, [hoveredNodeId, connections]);

  useEffect(() => {
    if (resetKey > 0) {
      // Reset camera position to default position [0, 8, 12]
      camera.position.set(0, 8, 12);
      
      // Reset controls target to center
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0.5, 0);
        controlsRef.current.update();
      }
    }
  }, [resetKey, camera]);
  // Convert lat/lon coordinates of our GIS nodes to local 3D positions safely
  const nodePositions = useMemo(() => {
    const positionsMap: Record<string, [number, number, number]> = {};
    nodes.forEach(node => {
      // 2D Earth coordinate conversion: X represents longitudinal offset, Z represents latitudinal offset
      const x = (node.lon - centerLon) * Math.cos(centerLat * Math.PI / 180) * SCALE_COEFF;
      const z = -(node.lat - centerLat) * SCALE_COEFF;
      const y = getTerrainElevation(x, z);
      positionsMap[node.id] = [x, y, z];
    });
    return positionsMap;
  }, [nodes, centerLat, centerLon]);

  // Dynamically calculate vertical offsets for labels to prevent collision in closely clustered nodes
  const labelOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    nodes.forEach(n => {
      offsets[n.id] = 0;
    });

    const COLLISION_THRESHOLD = 0.95; // Horizontal distance threshold in 3D scene units
    const heightStep = 0.5; // Vertical spacing per stacked node

    // Sort nodes to have a deterministic stacking order based on horizontal positioning
    const sortedNodes = [...nodes].sort((a, b) => {
      const xA = (a.lon - centerLon) * Math.cos(centerLat * Math.PI / 180) * SCALE_COEFF;
      const xB = (b.lon - centerLon) * Math.cos(centerLat * Math.PI / 180) * SCALE_COEFF;
      return xA - xB;
    });

    for (let i = 0; i < sortedNodes.length; i++) {
      const nodeA = sortedNodes[i];
      const posA = nodePositions[nodeA.id];
      if (!posA) continue;

      const nearbyOffsets: number[] = [];
      for (let j = 0; j < i; j++) {
        const nodeB = sortedNodes[j];
        const posB = nodePositions[nodeB.id];
        if (!posB) continue;

        const dx = posA[0] - posB[0];
        const dz = posA[2] - posB[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < COLLISION_THRESHOLD) {
          nearbyOffsets.push(offsets[nodeB.id]);
        }
      }

      let currentOffset = 0;
      while (nearbyOffsets.some(offset => Math.abs(offset - currentOffset) < 0.1)) {
        currentOffset += heightStep;
      }
      offsets[nodeA.id] = currentOffset;
    }

    return offsets;
  }, [nodes, nodePositions, centerLat, centerLon]);

  // Calculate local clutter/crowding index for each node (number of neighboring nodes within 2.2 horizontal scene units)
  const clutterScores = useMemo(() => {
    const scores: Record<string, number> = {};
    const DENSITY_RADIUS = 2.2;

    nodes.forEach(nodeA => {
      const posA = nodePositions[nodeA.id];
      if (!posA) {
        scores[nodeA.id] = 0;
        return;
      }

      let count = 0;
      nodes.forEach(nodeB => {
        if (nodeA.id === nodeB.id) return;
        const posB = nodePositions[nodeB.id];
        if (!posB) return;

        const dx = posA[0] - posB[0];
        const dz = posA[2] - posB[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < DENSITY_RADIUS) {
          count++;
        }
      });
      scores[nodeA.id] = count;
    });
    return scores;
  }, [nodes, nodePositions]);

  const [hoveredSector, setHoveredSector] = useState<any | null>(null);

  // Generate 8x8 network sector safety/health heatmap sectors based on nearby fault frequency
  const heatmapSectors = useMemo(() => {
    const sectors = [];
    const gridSize = 40;
    const divisions = 8;
    const cellSize = gridSize / divisions; // 5.0 units

    for (let u = 0; u < divisions; u++) {
      for (let v = 0; v < divisions; v++) {
        // Compute local 3D coordinates for cell center
        const localX = -20 + (u + 0.5) * cellSize;
        const localZ = -20 + (v + 0.5) * cellSize;

        // Base health starts at 100%
        let health = 100;
        let vicinityFaults = 0;
        let vicinityTotalNodes = 0;
        let nearestNodeLabel = '';
        let nearestNodeDist = Infinity;

        nodes.forEach((node) => {
          const nodePos = nodePositions[node.id];
          if (!nodePos) return;

          const dx = localX - nodePos[0];
          const dz = localZ - nodePos[2];
          const dist = Math.sqrt(dx * dx + dz * dz);

          // Vicinity check (within 12 units)
          if (dist < 12) {
            vicinityTotalNodes++;
            if (node.status === 'fault') {
              vicinityFaults++;
              // Health degrades based on distance to the fault
              health -= (90 / (dist + 1.5));
            }

            if (dist < nearestNodeDist) {
              nearestNodeDist = dist;
              nearestNodeLabel = node.label || node.id;
            }
          }
        });

        // Small baseline load fluctuation for high-fidelity rendering
        const seedValue = (u * 17 + v * 31);
        if (vicinityFaults === 0) {
          health -= Math.abs(Math.sin(seedValue)) * 5; // tiny health dip for healthy busy cells
        }

        health = Math.max(0, Math.min(100, Math.round(health)));

        // Determine cyberpunk safe/unstable colors based on health percentage
        let color = '#10b981'; // Emerald (Healthy: >= 80)
        let statusText = 'NOMINAL HEALTH';
        if (health < 40) {
          color = '#f43f5e'; // Rose (Critical Degraded: < 40)
          statusText = 'CRITICAL DEGRADATION';
        } else if (health < 80) {
          color = '#f59e0b'; // Amber (Compromised/Warning: 40 to 79)
          statusText = 'COMPROMISED WARNING';
        }

        sectors.push({
          id: `sec-${u}-${v}`,
          u,
          v,
          localX,
          localZ,
          health,
          color,
          statusText,
          nearestNodeLabel,
          vicinityFaults,
          vicinityTotalNodes
        });
      }
    }
    return sectors;
  }, [nodes, nodePositions]);

  // Store camera preset transitions in standard Refs to prevent unnecessary re-renders
  const lastSelectedNodeIdRef = useRef<string | null>(selectedNodeId);
  const lastPresetRef = useRef<string>(cameraPreset);
  const flightProgressRef = useRef<number>(0.0);

  // Trigger flight on selections
  useEffect(() => {
    if (selectedNodeId !== lastSelectedNodeIdRef.current || cameraPreset !== lastPresetRef.current) {
      flightProgressRef.current = 0.0;
      lastSelectedNodeIdRef.current = selectedNodeId;
      lastPresetRef.current = cameraPreset;
    }
  }, [selectedNodeId, cameraPreset]);

  useFrame((state, delta) => {
    // Determine target location coordinates based on select Node
    let desiredTarget = new THREE.Vector3(0, 0.5, 0);
    if (selectedNodeId && nodePositions[selectedNodeId]) {
      const pos = nodePositions[selectedNodeId];
      desiredTarget.set(pos[0], pos[1], pos[2]);
    }

    // Determine target camera placement
    let desiredCamPos = new THREE.Vector3(0, 8, 12);
    if (cameraPreset === 'top') {
      desiredCamPos.set(desiredTarget.x, 15, desiredTarget.z + 0.001);
    } else if (cameraPreset === 'pov') {
      desiredCamPos.set(desiredTarget.x - 2.5, desiredTarget.y + 1.2, desiredTarget.z + 2.5);
    } else if (cameraPreset === 'cinematic') {
      const time = state.clock.getElapsedTime() * 0.16;
      const radius = 10;
      desiredCamPos.set(
        desiredTarget.x + Math.sin(time) * radius,
        desiredTarget.y + 4.5 + Math.sin(time * 0.5) * 1.5,
        desiredTarget.z + Math.cos(time) * radius
      );
    } else { // default 'iso' preset
      desiredCamPos.set(desiredTarget.x, desiredTarget.y + 7.5, desiredTarget.z + 10);
    }

    // Smoothly fly both camera position and OrbitControls target
    if (flightProgressRef.current < 1.0) {
      flightProgressRef.current += delta * 1.5; // flight time limits
      camera.position.lerp(desiredCamPos, 0.08);
      
      if (controlsRef.current) {
        controlsRef.current.target.lerp(desiredTarget, 0.08);
        controlsRef.current.update();
      }
    } else if (cameraPreset === 'cinematic') {
      // In cinematic mode, continuously interpolate with slow velocity loops
      camera.position.lerp(desiredCamPos, 0.04);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(desiredTarget, 0.04);
        controlsRef.current.update();
      }
    }

    // Determine the current tracking vector focal center for compass
    const target = controlsRef.current ? controlsRef.current.target : new THREE.Vector3(0, 0.5, 0);
    const dx = camera.position.x - target.x;
    const dz = camera.position.z - target.z;
    
    // Compute current camera yaw angle
    const yaw = Math.atan2(dx, dz);
    const yawDeg = (yaw * 180) / Math.PI;

    // Premium micro-oscillation to simulate natural hydraulic gyro dampening
    const wiggle = Math.sin(state.clock.getElapsedTime() * 4.0) * 0.35;
    
    // Rotate dial ring to match 12 o'clock heading
    const ringRot = yawDeg + wiggle;

    // Dynamic direct DOM mutations for extreme 60fps performance without state re-renders
    const dialRing = document.getElementById('compass-dial-ring');
    const headingText = document.getElementById('compass-heading-text');

    if (dialRing) {
      dialRing.style.transform = `rotate(${ringRot}deg)`;
    }

    if (headingText) {
      let headingDeg = (360 - yawDeg) % 360;
      if (headingDeg < 0) headingDeg += 360;

      const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
      const idx = Math.round(headingDeg / (360 / directions.length)) % directions.length;
      const card = directions[idx];
      headingText.textContent = `${headingDeg.toFixed(1)}° ${card}`;
    }

    // --- REALTIME OVERHEAD MINI-MAP VIEWPORT TRACKING ---
    try {
      const curCamX = camera.position.x;
      const curCamZ = camera.position.z;
      const curTarget = controlsRef.current ? controlsRef.current.target : new THREE.Vector3(0, 0.5, 0);
      const curTgtX = curTarget.x;
      const curTgtZ = curTarget.z;

      if (localToSvgCoordsRef.current) {
        const sfCam = localToSvgCoordsRef.current(curCamX, curCamZ);
        const sfTgt = localToSvgCoordsRef.current(curTgtX, curTgtZ);

        const camGroup = document.getElementById('minimap-cam-group');
        const camLine = document.getElementById('minimap-cam-sight-line');
        const eyeTarget = document.getElementById('minimap-cam-target');

        // Draw camera sight direction angle directly
        const dxSvg = sfTgt.x - sfCam.x;
        const dySvg = sfTgt.y - sfCam.y;
        const angleDeg = (Math.atan2(dySvg, dxSvg) * 180) / Math.PI;

        if (camGroup) {
          camGroup.setAttribute('transform', `translate(${sfCam.x}, ${sfCam.y}) rotate(${angleDeg})`);
        }
        if (camLine) {
          camLine.setAttribute('x1', String(sfCam.x));
          camLine.setAttribute('y1', String(sfCam.y));
          camLine.setAttribute('x2', String(sfTgt.x));
          camLine.setAttribute('y2', String(sfTgt.y));
        }
        if (eyeTarget) {
          eyeTarget.setAttribute('cx', String(sfTgt.x));
          eyeTarget.setAttribute('cy', String(sfTgt.y));
        }
      }
    } catch (err) {
      console.warn('Overhead minimap projection tracking error:', err);
    }
  });

  return (
    <>
      {/* Cinematic Studio Lights */}
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[8, 15, 6]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#06b6d4" />
      <pointLight position={[10, 3, 10]} intensity={0.3} color="#ec4899" />

      {/* Subtle 3D terrain elevation representing varying topography of Homagama */}
      <TerrainElevation size={65} segments={40} />

      {/* Reference sea-level datum plane and grid at constant bottom */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#01040a" roughness={0.9} metalness={0.15} />
      </mesh>
      <gridHelper args={[60, 30, '#115e59', '#0a0f1d']} position={[0, -2.49, 0]} />

      {/* 3D Heatmap overlay sectors */}
      {heatmapActive && heatmapSectors.map((sec) => (
        <group key={sec.id}>
          {/* Main translucent sector tile */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[sec.localX, 0.012, sec.localZ]}
            receiveShadow
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredSector(sec);
            }}
            onPointerOut={(e) => {
              setHoveredSector(null);
            }}
          >
            <planeGeometry args={[4.8, 4.8]} />
            <meshBasicMaterial
              color={sec.color}
              transparent={true}
              opacity={sec.health < 40 ? 0.38 : 0.22}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Minimal sci-fi border grid dots/crosses index marker */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[sec.localX, 0.015, sec.localZ]}
          >
            <ringGeometry args={[0.08, 0.1, 4]} />
            <meshBasicMaterial color={sec.color} transparent={true} opacity={0.4} />
          </mesh>
        </group>
      ))}

      {/* 3D Floating sector diagnostics popover */}
      {heatmapActive && hoveredSector && (
        <Html
          position={[hoveredSector.localX, 0.2, hoveredSector.localZ]}
          center
          distanceFactor={12}
          className="pointer-events-none select-none z-20"
        >
          <div className="px-2.5 py-1.5 bg-slate-950/92 border border-slate-800/90 backdrop-blur rounded shadow-2xl font-mono text-[9px] w-40 space-y-1 text-left">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-0.5 animate-pulse">
              <span className="text-slate-400 font-bold">GRID SEC [{hoveredSector.u},{hoveredSector.v}]</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hoveredSector.color }} />
            </div>
            <div>
              <span className="text-slate-500 mr-1 uppercase">HEALTH:</span>
              <span className="font-extrabold text-[10px]" style={{ color: hoveredSector.color }}>{hoveredSector.health}%</span>
            </div>
            <div>
              <span className="text-slate-500 mr-2 uppercase">VICINITY FAULTS:</span>
              <span className="font-semibold text-white">{hoveredSector.vicinityFaults} / {hoveredSector.vicinityTotalNodes}</span>
            </div>
            <div className="truncate text-slate-350">
              <span className="text-slate-500 mr-1 uppercase">STATUS:</span>
              <span className="font-semibold" style={{ color: hoveredSector.color }}>{hoveredSector.statusText}</span>
            </div>
            {hoveredSector.nearestNodeLabel && (
              <div className="truncate text-slate-500 flex items-center gap-0.5">
                <span>NEARBY:</span>
                <span className="text-slate-450 font-medium truncate max-w-[15ch]">{hoveredSector.nearestNodeLabel}</span>
              </div>
            )}
          </div>
        </Html>
      )}

      {/* 500m range ring around selected node */}
      {selectedNodeId && nodePositions[selectedNodeId] && (() => {
        const selectedNode = nodes.find(n => n.id === selectedNodeId);
        if (!selectedNode) return null;
        // 500m range in our 3D scale is roughly 500 / 111320 * SCALE_COEFF = ~2.7 units
        const radioRadiusUnits = (500 / 111320) * SCALE_COEFF;
        const pos = nodePositions[selectedNodeId];

        return (
          <group position={[pos[0], 0.015, pos[2]]}>
            {/* Soft range shading */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0, radioRadiusUnits, 64]} />
              <meshBasicMaterial
                color="#06b6d4"
                transparent={true}
                opacity={0.05}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* Ground ring boundary */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radioRadiusUnits - 0.05, radioRadiusUnits + 0.05, 64]} />
              <meshBasicMaterial
                color="#06b6d4"
                transparent={true}
                opacity={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Dotted indicator ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radioRadiusUnits * 0.5 - 0.02, radioRadiusUnits * 0.5 + 0.02, 32]} />
              <meshBasicMaterial
                color="#06b6d4"
                transparent={true}
                opacity={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })()}

      {/* 3D Network Nodes / Poles */}
      {nodes.map((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return null;

        let isProximate = false;
        let proximityDistance = 0;

        if (selectedNodeId && selectedNodeId !== node.id) {
          const selectedNodeObject = nodes.find(n => n.id === selectedNodeId);
          if (selectedNodeObject) {
            const dist = getDistanceMeters(selectedNodeObject.lat, selectedNodeObject.lon, node.lat, node.lon);
            if (dist <= 500) {
              isProximate = true;
              proximityDistance = dist;
            }
          }
        }

        return (
          <group key={node.id}>
            <NodeMesh
              node={node}
              position={pos}
              isSelected={selectedNodeId === node.id}
              isProximate={isProximate}
              proximityDistance={proximityDistance}
              onSelect={onSelectNode}
              geoZoomEnabled={geoZoomEnabled}
              labelOffset={labelOffsets[node.id]}
              clutterScore={clutterScores[node.id] || 0}
              radarSpeed={radarSpeed}
            />
            {signalLayerActive && (
              <SignalWaveMesh position={pos} isFault={node.status === 'fault'} />
            )}
          </group>
        );
      })}

      {/* Dynamic drifting wind storm trail particles based on custom direction angle guidelines */}
      <StormWindTrails windSpeed={windSpeed} windDirection={windDirection} isActive={isWeatherActive} />

      {/* Overlapping Fiber/Copper Connection Cables */}
      {connections.map((conn, idx) => {
        const fromPos = nodePositions[conn.from];
        const toPos = nodePositions[conn.to];
        if (!fromPos || !toPos) return null;

        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        const fromFault = fromNode ? fromNode.status === 'fault' : false;
        const toFault = toNode ? toNode.status === 'fault' : false;
        const isHighlighted = highlightedConnectionKeys.has(`${conn.from}-${conn.to}`);
        const isRoad = fromNode?.type === 'msan' || fromNode?.type === 'cabinet' || toNode?.type === 'msan' || toNode?.type === 'cabinet';

        return (
          <Cable
            key={`${conn.from}-${conn.to}-${idx}`}
            fromPos={fromPos}
            toPos={toPos}
            fromFault={fromFault}
            toFault={toFault}
            isHighlighted={isHighlighted}
            type={conn.type}
            isTopologyOverviewActive={isTopologyOverviewActive}
            segmentHeatmapActive={segmentHeatmapActive}
            isWeatherActive={isWeatherActive}
            windSpeed={windSpeed}
            fromId={conn.from}
            toId={conn.to}
            isRoad={isRoad}
          />
        );
      })}

      {/* Controls to traverse the digital twin space */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2 - 0.05} // prevent going fully under map
        autoRotate={orbitActive}
        autoRotateSpeed={1.5}
      />
    </>
  );
}

class WebGLErrorBoundary extends React.Component<{ fallback: React.ReactNode; onError?: () => void; children?: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("WebGL or ThreeJS rendering failed, reverting to High-Fidelity 2D SVG presentation:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Main DigitalTwinMap React Component Export
 */
interface DigitalTwinMapProps {
  nodes: NetworkNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  onSelectNode: (node: NetworkNode | null) => void;
  hoveredNodeId?: string | null;
  playbackHourAgo: number;
  setPlaybackHourAgo: (hour: number) => void;
  isPlaybackPlaying: boolean;
  setIsPlaybackPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  isWeatherActive: boolean;
  setIsWeatherActive: (active: boolean) => void;
  viewMode?: '3d' | '2d';
}

export default function DigitalTwinMap({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  hoveredNodeId = null,
  playbackHourAgo,
  setPlaybackHourAgo,
  isPlaybackPlaying,
  setIsPlaybackPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  isWeatherActive,
  setIsWeatherActive,
  viewMode = '3d'
}: DigitalTwinMapProps) {
  const [resetKey, setResetKey] = useState(0);
  const [heatmapActive, setHeatmapActive] = useState<boolean>(false);
  const [orbitActive, setOrbitActive] = useState<boolean>(false);
  const [geoZoomEnabled, setGeoZoomEnabled] = useState<boolean>(true);
  const [radarSpeed, setRadarSpeed] = useState<number>(1.0);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [isTopologyOverviewActive, setIsTopologyOverviewActive] = useState<boolean>(true);
  const [minimapZoom, setMinimapZoom] = useState<number>(1.2);
  const [minimapCenterLock, setMinimapCenterLock] = useState<boolean>(true);

  // WebGL Fallback and 2D Interactive Controls
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean>(true);
  const [svgPanX, setSvgPanX] = useState<number>(0);
  const [svgPanY, setSvgPanY] = useState<number>(0);
  const [svgZoom, setSvgZoom] = useState<number>(4.0);
  const [isPanningSvg, setIsPanningSvg] = useState<boolean>(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // WebGL Support check removed to prevent premature 2D fallback when contexts are exhausted.
  // We rely on WebGLErrorBoundary to catch actual rendering failures.

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.closest('.interactive-node')) return;
    setIsPanningSvg(true);
    setPanStart({ x: e.clientX - svgPanX, y: e.clientY - svgPanY });
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanningSvg) return;
    setSvgPanX(e.clientX - panStart.x);
    setSvgPanY(e.clientY - panStart.y);
  };

  const handleSvgMouseUp = () => {
    setIsPanningSvg(false);
  };

  const handleSvgTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.closest('.interactive-node')) return;
    if (e.touches.length === 1) {
      setIsPanningSvg(true);
      setPanStart({ x: e.touches[0].clientX - svgPanX, y: e.touches[0].clientY - svgPanY });
    }
  };

  const handleSvgTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isPanningSvg) return;
    if (e.touches.length === 1) {
      setSvgPanX(e.touches[0].clientX - panStart.x);
      setSvgPanY(e.touches[0].clientY - panStart.y);
    }
  };

  const handleSvgTouchEnd = () => {
    setIsPanningSvg(false);
  };

  const handleSvgWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
      setSvgZoom(z => Math.min(200.0, z * zoomFactor));
    } else {
      setSvgZoom(z => Math.max(0.6, z / zoomFactor));
    }
  };


  // New customizable Digital Twin dashboard state layers
  const [cameraPreset, setCameraPreset] = useState<string>('iso');
  const [windSpeed, setWindSpeed] = useState<number>(45);
  const [windDirection, setWindDirection] = useState<string>('NE');
  const [signalLayerActive, setSignalLayerActive] = useState<boolean>(true);
  const [segmentHeatmapActive, setSegmentHeatmapActive] = useState<boolean>(false);

  // Collapsible sub-headers and overall global HUD layout visibility controls
  const [isGisHudOpen, setIsGisHudOpen] = useState<boolean>(true);
  const [isMinimapOpen, setIsMinimapOpen] = useState<boolean>(true);
  const [isTopHeaderOpen, setIsTopHeaderOpen] = useState<boolean>(true);
  const [isGlobalHudVisible, setIsGlobalHudVisible] = useState<boolean>(true);

  // Drag states for personal HUD configurations to clear viewport
  const [gisPos, setGisPos] = useState({ x: 0, y: 0 });
  const [minimapPos, setMinimapPos] = useState({ x: 0, y: 0 });
  const [topHeaderPos, setTopHeaderPos] = useState({ x: 0, y: 0 });
  const [legendPos, setLegendPos] = useState({ x: 0, y: 0 });

  const resetHudPositions = () => {
    setGisPos({ x: 0, y: 0 });
    setMinimapPos({ x: 0, y: 0 });
    setTopHeaderPos({ x: 0, y: 0 });
    setLegendPos({ x: 0, y: 0 });
  };

  // Reusable lightweight mouse/touch dragging handler
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, panel: 'gis' | 'minimap' | 'topHeader' | 'legend') => {
    // Only drag on left mouse button clicks
    if ('button' in e && e.button !== 0) return;

    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const startX = clientX;
    const startY = clientY;

    let currentX = 0;
    let currentY = 0;

    if (panel === 'gis') {
      currentX = gisPos.x;
      currentY = gisPos.y;
    } else if (panel === 'minimap') {
      currentX = minimapPos.x;
      currentY = minimapPos.y;
    } else if (panel === 'topHeader') {
      currentX = topHeaderPos.x;
      currentY = topHeaderPos.y;
    } else if (panel === 'legend') {
      currentX = legendPos.x;
      currentY = legendPos.y;
    }

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const isMoveTouch = 'touches' in moveEvent;
      if (isMoveTouch && (moveEvent as TouchEvent).touches.length === 0) return;

      const moveX = isMoveTouch ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const moveY = isMoveTouch ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;

      const deltaX = moveX - startX;
      const deltaY = moveY - startY;

      if (panel === 'gis') {
        setGisPos({ x: currentX + deltaX, y: currentY + deltaY });
      } else if (panel === 'minimap') {
        setMinimapPos({ x: currentX + deltaX, y: currentY + deltaY });
      } else if (panel === 'topHeader') {
        setTopHeaderPos({ x: currentX + deltaX, y: currentY + deltaY });
      } else if (panel === 'legend') {
        setLegendPos({ x: currentX + deltaX, y: currentY + deltaY });
      }
    };

    const handleDragEnd = () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  };

  // Keyboard shortcut listener to toggle entire HUD elements via the 'H' / 'h' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsGlobalHudVisible(visible => !visible);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [thunderFlash, setThunderFlash] = useState<boolean>(false);

  // Thunder Flash effect loop
  useEffect(() => {
    if (!isWeatherActive) {
      setThunderFlash(false);
      return;
    }
    
    let isMounted = true;
    let flashTimeout: NodeJS.Timeout;
    
    const triggerFlash = () => {
      if (!isMounted) return;
      setThunderFlash(true);
      setTimeout(() => {
        if (!isMounted) return;
        setThunderFlash(false);
        if (Math.random() > 0.45) {
          setTimeout(() => {
            if (!isMounted) return;
            setThunderFlash(true);
            setTimeout(() => {
              if (!isMounted) return;
              setThunderFlash(false);
            }, 50);
          }, 100);
        }
      }, 90);

      const nextDelay = 5000 + Math.random() * 10000;
      flashTimeout = setTimeout(triggerFlash, nextDelay);
    };

    const initialDelay = 2000 + Math.random() * 4000;
    flashTimeout = setTimeout(triggerFlash, initialDelay);

    return () => {
      isMounted = false;
      clearTimeout(flashTimeout);
    };
  }, [isWeatherActive]);

  // Rain Canvas rendering loop
  useEffect(() => {
    if (!isWeatherActive) return;
    const canvas = rainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth || 800);
    let height = (canvas.height = canvas.offsetHeight || 500);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth || 800;
        height = canvas.height = canvas.offsetHeight || 500;
      }
    };
    window.addEventListener('resize', handleResize);

    const drops: { x: number; y: number; speed: number; len: number; opacity: number }[] = [];
    for (let i = 0; i < 140; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: 10 + Math.random() * 8,
        len: 12 + Math.random() * 16,
        opacity: 0.15 + Math.random() * 0.35,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        
        ctx.strokeStyle = `rgba(56, 189, 248, ${drop.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + 1.2, drop.y + drop.len);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x += drop.speed * 0.08;

        if (drop.y > height) {
          drop.y = -drop.len;
          drop.x = Math.random() * width;
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isWeatherActive]);

  const highlightedConnectionKeys = useMemo(() => {
    return getConnectedPaths(hoveredNodeId, connections);
  }, [hoveredNodeId, connections]);

  // Dynamically calculate the geographic center of our loaded GIS network elements
  const centerLat = useMemo(() => {
    if (nodes.length === 0) return DEFAULT_CENTER_LAT;
    const sum = nodes.reduce((acc, n) => acc + n.lat, 0);
    return sum / nodes.length;
  }, [nodes]);

  const centerLon = useMemo(() => {
    if (nodes.length === 0) return DEFAULT_CENTER_LON;
    const sum = nodes.reduce((acc, n) => acc + n.lon, 0);
    return sum / nodes.length;
  }, [nodes]);

  // Dynamically calculate and set best zoom level when switching to 2D view or nodes change
  useEffect(() => {
    if (viewMode === '2d' && nodes && nodes.length > 0) {
      let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
      nodes.forEach(n => {
        if (n.lat < minLat) minLat = n.lat;
        if (n.lat > maxLat) maxLat = n.lat;
        if (n.lon < minLon) minLon = n.lon;
        if (n.lon > maxLon) maxLon = n.lon;
      });
      
      const latDiff = maxLat - minLat;
      const lonDiff = maxLon - minLon;
      
      if (latDiff > 0 && lonDiff > 0) {
        // Approximate distance based on Equirectangular projection
        const latPx = latDiff * 111320;
        const lonPx = lonDiff * 111320 * Math.cos(centerLat * (Math.PI / 180));
        
        // Target an area of 800x600 with 30% padding
        const zoomX = 800 / lonPx;
        const zoomY = 600 / latPx;
        const targetZoom = Math.min(zoomX, zoomY) * 0.7;
        
        // Cap it between reasonable values
        setSvgZoom(Math.max(1.0, Math.min(100.0, targetZoom)));
        setSvgPanX(0);
        setSvgPanY(0);
      } else if (latDiff === 0 && lonDiff === 0) {
        setSvgZoom(100.0);
      }
    }
  }, [viewMode, nodes, centerLat]);


  // Dynamically calculate coordinate bounding boxes to keep mini-map perfectly centered & responsive
  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minLat: 6.825, maxLat: 6.855, minLon: 79.985, maxLon: 80.025 };
    }

    // Find absolute bounds of all nodes
    let allMinLat = Infinity;
    let allMaxLat = -Infinity;
    let allMinLon = Infinity;
    let allMaxLon = -Infinity;
    nodes.forEach(n => {
      if (n.lat < allMinLat) allMinLat = n.lat;
      if (n.lat > allMaxLat) allMaxLat = n.lat;
      if (n.lon < allMinLon) allMinLon = n.lon;
      if (n.lon > allMaxLon) allMaxLon = n.lon;
    });

    const latDelta = allMaxLat - allMinLat;
    const lonDelta = allMaxLon - allMinLon;
    const baseLatSpan = Math.max(0.012, latDelta * 1.3);
    const baseLonSpan = Math.max(0.016, lonDelta * 1.3);

    // Dynamic centering coordinate selection
    const selectedNodeObj = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
    
    let targetCenterLat = (allMinLat + allMaxLat) / 2;
    let targetCenterLon = (allMinLon + allMaxLon) / 2;
    
    if (minimapCenterLock && selectedNodeObj) {
      targetCenterLat = selectedNodeObj.lat;
      targetCenterLon = selectedNodeObj.lon;
    }

    // Apply zoom factor safely
    const latSpan = baseLatSpan / minimapZoom;
    const lonSpan = baseLonSpan / minimapZoom;

    return {
      minLat: targetCenterLat - latSpan / 2,
      maxLat: targetCenterLat + latSpan / 2,
      minLon: targetCenterLon - lonSpan / 2,
      maxLon: targetCenterLon + lonSpan / 2
    };
  }, [nodes, selectedNodeId, minimapZoom, minimapCenterLock]);

  // Translate GIS latitude/longitude pairs to 100x100 SVG coordinate percentages
  const getSvgCoords = (lat: number, lon: number) => {
    const lonSpan = bounds.maxLon - bounds.minLon;
    const latSpan = bounds.maxLat - bounds.minLat;

    const x = lonSpan === 0 ? 50 : ((lon - bounds.minLon) / lonSpan) * 100;
    const y = latSpan === 0 ? 50 : (1 - ((lat - bounds.minLat) / latSpan)) * 100;

    return { x, y };
  };

  // Translate local 3D horizontal plane (x, z) space back to SVG percentages (x, y)
  const localToSvgCoords = (lx: number, lz: number) => {
    const cosFactor = Math.cos(centerLat * Math.PI / 180);
    const lon = lx / (cosFactor * SCALE_COEFF) + centerLon;
    const lat = -lz / SCALE_COEFF + centerLat;
    return getSvgCoords(lat, lon);
  };

  const renderFullscreen2DMap = () => {
    return (
      <div className="w-full h-full relative bg-[#020617] flex items-center justify-center select-none" id="fullscreen-vector-canvas-wrapper">
        {/* Background Cyberpunk Grid Designs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950 opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.35)_1px,transparent_1px)] bg-[size:15px_15px] opacity-40 animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.06)_1px,transparent_1px)] bg-[size:90px_90px] opacity-25" />

        {/* Scaled Interactive Vector SVG Stage */}
        <svg
          className="w-full h-full relative z-10 cursor-gather active:cursor-grabbing"
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onTouchStart={handleSvgTouchStart}
          onTouchMove={handleSvgTouchMove}
          onTouchEnd={handleSvgTouchEnd}
          onWheel={handleSvgWheel}
          id="fs-hud-radar-svg"
        >
          <g transform={`translate(${svgPanX}, ${svgPanY}) scale(${svgZoom})`} className="origin-center transition-all duration-300 ease-out">
            {/* Concentric compass radar design in background */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth={0.6} />
            <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth={0.5} strokeDasharray="3,3" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth={0.5} />

            {/* Compass axes projection markings */}
            <line x1="-10" y1="50" x2="110" y2="50" stroke="rgba(56, 189, 248, 0.04)" strokeWidth={0.5} strokeDasharray="1,4" />
            <line x1="50" y1="-10" x2="50" y2="110" stroke="rgba(56, 189, 248, 0.04)" strokeWidth={0.5} strokeDasharray="1,4" />

            {/* Active Network Physical Links */}
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              const start = getSvgCoords(fromNode.lat, fromNode.lon);
              const end = getSvgCoords(toNode.lat, toNode.lon);
              const isAlarmed = fromNode.status === 'fault' || toNode.status === 'fault';
              const isSelected = selectedNodeId === fromNode.id || selectedNodeId === toNode.id;
              const isHighlighted = highlightedConnectionKeys.has(`${conn.from}-${conn.to}`);

              const strokeColor = isHighlighted
                ? (conn.type === 'fiber' ? "#38bdf8" : "#fbbf24")
                : isAlarmed
                  ? "#f43f5e"
                  : isSelected
                    ? "#06b6d4"
                    : "#1e293b";

              const strokeWidth = isHighlighted ? 1.4 : isAlarmed ? 1.0 : isSelected ? 0.8 : 0.45;
              const strokeOpacity = isHighlighted ? 1.0 : isAlarmed ? 0.85 : isSelected ? 0.8 : 0.45;

              return (
                <g key={`fs2d-conn-${idx}`}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    strokeDasharray={conn.type === 'copper' ? "1.5,1.5" : undefined}
                  />

                  {/* Flow Simulation Signal Bullet Particles */}
                  {isTopologyOverviewActive && !isAlarmed && (
                    <circle r={0.8} fill={conn.type === 'fiber' ? "#22d3ee" : "#f59e0b"}>
                      <animate attributeName="cx" from={start.x} to={end.x} dur={`${1.6 + idx % 3}s`} repeatCount="indefinite" />
                      <animate attributeName="cy" from={start.y} to={end.y} dur={`${1.6 + idx % 3}s`} repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* 500 meter proximity contact halo around selected node */}
            {selectedNodeId && (() => {
              const selectedNode = nodes.find(n => n.id === selectedNodeId);
              if (!selectedNode) return null;
              const { x: cx, y: cy } = getSvgCoords(selectedNode.lat, selectedNode.lon);
              const latDiff = 500 / 111320;
              const { y: yShift } = getSvgCoords(selectedNode.lat + latDiff, selectedNode.lon);
              const rSvg = Math.abs(cy - yShift);

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={rSvg}
                  fill="#06b6d4"
                  fillOpacity={0.035}
                  stroke="#06b6d4"
                  strokeWidth={0.3}
                  strokeDasharray="1,1"
                  strokeOpacity={0.35}
                />
              );
            })()}

            {/* Render Nodes layout */}
            {nodes.map(node => {
              const { x, y } = getSvgCoords(node.lat, node.lon);
              const isSelected = selectedNodeId === node.id;
              const isFault = node.status === 'fault';

              let isProximate = false;
              if (selectedNodeId && selectedNodeId !== node.id) {
                const selectedNode = nodes.find(n => n.id === selectedNodeId);
                if (selectedNode) {
                  const dist = getDistanceMeters(selectedNode.lat, selectedNode.lon, node.lat, node.lon);
                  if (dist <= 500) {
                    isProximate = true;
                  }
                }
              }

              const color = isFault
                ? '#f43f5e'
                : isSelected
                  ? '#22d3ee'
                  : isProximate
                    ? '#38bdf8'
                    : node.type === 'msan'
                      ? '#f97316'
                      : node.type === 'cabinet'
                        ? '#94a3b8'
                        : node.type === 'dp'
                          ? '#06b6d4'
                          : '#64748b';

              return (
                <g
                  key={`fs2d-node-${node.id}`}
                  className="cursor-pointer group/fs2dnode interactive-node"
                  onClick={() => onSelectNode(node)}
                >
                  {/* Outer Pulsing Selection tracking halo ring */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={3.8}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth={0.4}
                      className="animate-pulse"
                    />
                  )}

                  {/* Alarm Ping Beacon */}
                  {isFault && (
                    <circle
                      cx={x}
                      cy={y}
                      r={5.0}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={0.4}
                      opacity={0.8}
                      className="animate-ping"
                      style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '1.4s' }}
                    />
                  )}

                  {/* Physical Geometries */}
                  {node.type === 'msan' ? (
                    <polygon
                      points={`${x},${y - 1.8} ${x + 1.8},${y} ${x},${y + 1.8} ${x - 1.8},${y}`}
                      fill={color}
                      stroke="#020617"
                      strokeWidth={0.3}
                    />
                  ) : node.type === 'cabinet' ? (
                    <rect
                      x={x - 1.5}
                      y={y - 1.5}
                      width={3.0}
                      height={3.0}
                      rx={0.4}
                      fill={color}
                      stroke="#020617"
                      strokeWidth={0.3}
                    />
                  ) : (
                    <circle
                      cx={x}
                      cy={y}
                      r={isFault ? 1.8 : isSelected ? 1.5 : 1.1}
                      fill={color}
                      stroke="#020617"
                      strokeWidth={0.25}
                    />
                  )}

                  {/* Smart Label with tooltip indicators */}
                  <g className="transition-opacity group-hover/fs2dnode:opacity-100 opacity-70">
                    <rect
                      x={x + 3.2}
                      y={y - 3.2}
                      width={node.label ? node.label.length * 2.3 + 4 : 22}
                      height={6.2}
                      rx={0.8}
                      fill="rgba(2, 6, 23, 0.88)"
                      stroke={isSelected ? "#22d3ee" : isFault ? "#ef4444" : "rgba(30, 41, 59, 0.45)"}
                      strokeWidth={0.25}
                    />
                    <text
                      x={x + 4.8}
                      y={y + 1}
                      fill={isSelected ? "#22d3ee" : isFault ? "#f43f5e" : "#94a3b8"}
                      fontSize="3.2"
                      className="font-bold tracking-wide font-mono"
                    >
                      {node.label || node.id}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* SVG Floating Controls (Zoom, Reset, Recenter) */}
        <div className="absolute bottom-[98px] left-4 p-2.5 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl flex items-center gap-2 z-10 font-mono shadow-2xl text-[9px] text-slate-300 pointer-events-auto select-none">
          <button
            onClick={() => setSvgZoom(z => Math.max(0.6, z - 0.2))}
            className="w-5 h-5 bg-slate-950 border border-slate-800 hover:border-slate-700 active:bg-slate-900 rounded flex items-center justify-center font-bold text-[#38bdf8] cursor-pointer"
            title="Zoom out"
          >
            -
          </button>
          <span className="text-[9px] font-bold text-slate-400 w-11 text-center select-none">
            {Math.round(svgZoom * 100)}%
          </span>
          <button
            onClick={() => setSvgZoom(z => Math.min(200.0, z + 0.2))}
            className="w-5 h-5 bg-slate-950 border border-slate-800 hover:border-slate-700 active:bg-slate-900 rounded flex items-center justify-center font-bold text-[#38bdf8] cursor-pointer"
            title="Zoom in"
          >
            +
          </button>
          
          <div className="w-[1px] h-3.5 bg-slate-800" />

          <button
            onClick={() => {
              setSvgPanX(0);
              setSvgPanY(0);
              setSvgZoom(1.0);
            }}
            className="px-2 h-5 bg-slate-950 border border-slate-800 hover:border-slate-700 active:bg-slate-900 rounded text-[8.5px] font-bold text-slate-400 flex items-center justify-center gap-1 cursor-pointer"
            title="Reset SVG Pan/Zoom state"
          >
            <RotateCcw className="w-3 h-3 text-[#38bdf8]" />
            <span>RECENTER MAP</span>
          </button>
        </div>

        {/* Fallback Warning Overlay if WebGL crashed */}
        {!isWebGLSupported && (
          <div className="absolute top-[68px] left-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 z-10 flex items-center gap-2 max-w-xs font-mono backdrop-blur-md animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8.5px] font-bold text-amber-400 leading-none">WEBGL COMPATIBILITY MODIFICATION</span>
              <span className="text-[7.5px] text-amber-350 leading-none mt-1">NOC terminal loaded 2D vector matrix fallback automatically.</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/60 shadow-inner">
      {viewMode === '3d' ? (
        <WebGLErrorBoundary
          fallback={renderFullscreen2DMap()}
        >
          <Canvas
            shadows
            camera={{ position: [0, 8, 12], fov: 45 }}
            className="w-full h-full"
          >
            <MapScene
              nodes={nodes}
              connections={connections}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              centerLat={centerLat}
              centerLon={centerLon}
              resetKey={resetKey}
              heatmapActive={heatmapActive}
              orbitActive={orbitActive}
              hoveredNodeId={hoveredNodeId}
              geoZoomEnabled={geoZoomEnabled}
              radarSpeed={radarSpeed}
              isTopologyOverviewActive={isTopologyOverviewActive}
              cameraPreset={cameraPreset}
              windSpeed={windSpeed}
              windDirection={windDirection}
              isWeatherActive={isWeatherActive}
              signalLayerActive={signalLayerActive}
              segmentHeatmapActive={segmentHeatmapActive}
              localToSvgCoords={localToSvgCoords}
            />
          </Canvas>
        </WebGLErrorBoundary>
      ) : (
        renderFullscreen2DMap()
      )}



      {/* Animated Weather rain canvas and atmospheric lighting overlays */}
      {isWeatherActive && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-sky-950/20 mix-blend-color-burn transition-opacity duration-1000" />
          <canvas
            ref={rainCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>
      )}

      {/* Lightning Flash screen overlays */}
      {isWeatherActive && thunderFlash && (
        <div className="absolute inset-0 pointer-events-none z-40 bg-white/35 transition-opacity duration-75 animate-pulse" />
      )}

      {/* Persistent 2D Vector Mini-Map HUD Overlay in the upper right corner */}
      {isGlobalHudVisible && (
        !isMinimapOpen ? (
          <div 
            className="absolute top-4 right-4 z-10"
            style={{ transform: `translate3d(${minimapPos.x}px, ${minimapPos.y}px, 0px)` }}
          >
            <button
              onClick={() => setIsMinimapOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/95 backdrop-blur border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl text-[9px] font-mono text-[#38bdf8] font-bold uppercase transition-all shadow-xl cursor-pointer select-none"
              title="Expand 2D interactive vector minimap overlay"
            >
              <span>🗺️ 2D TOPOLOGY MAP [Expand ▼]</span>
            </button>
          </div>
        ) : (
          <div 
            className="absolute top-4 right-4 p-3 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl text-[10px] font-mono text-slate-300 shadow-2xl z-10 w-44 sm:w-52 pointer-events-auto select-none space-y-2.5 transition-all hover:border-[#38bdf8]/40 flex flex-col"
            id="persistent-2d-minimap"
            style={{ transform: `translate3d(${minimapPos.x}px, ${minimapPos.y}px, 0px)` }}
          >
            <div 
              onMouseDown={(e) => handleDragStart(e, 'minimap')}
              onTouchStart={(e) => handleDragStart(e, 'minimap')}
              className="flex items-center justify-between border-b border-slate-800 pb-1.5 cursor-grab active:cursor-grabbing select-none hover:bg-slate-800/40 rounded px-1 -mx-1 transition-all group/hdr"
              title="Drag here to move 2D minimap"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimapOpen(false);
                }}
                className="flex items-center space-x-1.5 text-[#38bdf8] font-bold hover:text-white transition-colors cursor-pointer text-left focus:outline-none pointer-events-auto"
                title="Collapse 2D Minimap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse inline-block" />
                <span>2D TOPOLOGY</span>
                <span className="text-[7.5px] text-slate-500 font-normal ml-0.5">▲</span>
              </button>
              <span className="text-[7.5px] font-mono text-slate-500 group-hover/hdr:text-[#38bdf8] font-bold tracking-widest leading-none">:: DRAG</span>
            </div>

        {/* Interactive Coordinate Matrix viewport */}
        <div className="relative w-full aspect-square bg-[#030712] border border-slate-800/80 rounded-lg overflow-hidden flex items-center justify-center p-1 group">
          {/* Symmetrical grid pattern overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950 opacity-80" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:10px_10px] opacity-25" />
          
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full relative z-10"
          >
            {/* Draw topological fiber/copper routes first */}
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              const start = getSvgCoords(fromNode.lat, fromNode.lon);
              const end = getSvgCoords(toNode.lat, toNode.lon);
              const isAlarmed = fromNode.status === 'fault' || toNode.status === 'fault';
              const isSelected = selectedNodeId === fromNode.id || selectedNodeId === toNode.id;
              const isHighlighted = highlightedConnectionKeys.has(`${conn.from}-${conn.to}`);
              
              const strokeColor = isHighlighted
                ? (conn.type === 'fiber' ? "#38bdf8" : "#fbbf24")
                : isAlarmed
                  ? "#ef4444"
                  : isSelected
                    ? "#38bdf8"
                    : "#14b8a6";

              const strokeWidth = isHighlighted
                ? 2.2
                : isAlarmed
                  ? 1.4
                  : isSelected
                    ? 1.0
                    : 0.6;

              const strokeOpacity = isHighlighted
                ? 1.0
                : isAlarmed
                  ? 0.9
                  : isSelected
                    ? 0.8
                    : 0.3;

              return (
                <line
                  key={`minimap-conn-${idx}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                />
              );
            })}

            {/* 500m proximity circle around selected node on 2D SVG Mini-Map */}
            {selectedNodeId && (() => {
              const selectedNode = nodes.find(n => n.id === selectedNodeId);
              if (!selectedNode) return null;
              
              const { x: cx, y: cy } = getSvgCoords(selectedNode.lat, selectedNode.lon);
              const latDiff = 500 / 111320;
              const { y: yShift } = getSvgCoords(selectedNode.lat + latDiff, selectedNode.lon);
              const rSvg = Math.abs(cy - yShift);
              
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={rSvg}
                  fill="#38bdf8"
                  fillOpacity={0.06}
                  stroke="#38bdf8"
                  strokeWidth={0.5}
                  strokeDasharray="1.5,1.5"
                  strokeOpacity={0.45}
                />
              );
            })()}

            {/* Draw proximity dashed connection guidelines */}
            {selectedNodeId && nodes.map((node) => {
              if (selectedNodeId === node.id) return null;
              const selectedNode = nodes.find(n => n.id === selectedNodeId);
              if (!selectedNode) return null;
              
              const dist = getDistanceMeters(selectedNode.lat, selectedNode.lon, node.lat, node.lon);
              if (dist <= 500) {
                const start = getSvgCoords(selectedNode.lat, selectedNode.lon);
                const end = getSvgCoords(node.lat, node.lon);
                
                return (
                  <line
                    key={`minimap-prox-link-${node.id}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="#38bdf8"
                    strokeWidth={0.6}
                    strokeDasharray="1.5,1.5"
                    strokeOpacity={0.5}
                  />
                );
              }
              return null;
            })}

            {/* Draw topological antenna poles / loops inside vector map */}
            {nodes.map(node => {
              const { x, y } = getSvgCoords(node.lat, node.lon);
              const isSelected = selectedNodeId === node.id;
              const isFault = node.status === 'fault';
              
              let isProximate = false;
              if (selectedNodeId && selectedNodeId !== node.id) {
                const selectedNode = nodes.find(n => n.id === selectedNodeId);
                if (selectedNode) {
                  const dist = getDistanceMeters(selectedNode.lat, selectedNode.lon, node.lat, node.lon);
                  if (dist <= 500) {
                    isProximate = true;
                  }
                }
              }

              const color = isFault 
                ? '#f43f5e' 
                : isSelected 
                  ? '#38bdf8' 
                  : isProximate 
                    ? '#38bdf8' 
                    : node.type === 'msan'
                      ? '#f97316'
                      : node.type === 'cabinet'
                        ? '#94a3b8'
                        : node.type === 'dp' 
                          ? '#06b6d4' 
                          : '#64748b';
              
              return (
                <g 
                  key={`minimap-node-${node.id}`} 
                  className="cursor-pointer group/node"
                  onClick={() => onSelectNode(node)}
                >
                  {/* Selection tracking cursor */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={5.5}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={0.8}
                      className="animate-pulse"
                    />
                  )}

                  {/* Proximity tracking outer halo circle */}
                  {isProximate && (
                    <circle
                      cx={x}
                      cy={y}
                      r={4.0}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth={0.5}
                      strokeOpacity={0.85}
                    />
                  )}
                  
                  {/* Glowing localized warning rings */}
                  {isFault && (
                    <circle
                      cx={x}
                      cy={y}
                      r={6.5}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth={0.6}
                      opacity={0.8}
                      className="animate-ping"
                      style={{ transformOrigin: `${x}px ${y}px` }}
                    />
                  )}
                  
                  {/* Concrete Node representation */}
                  {node.type === 'msan' ? (
                    <polygon
                      points={`${x},${y - 2.8} ${x + 2.8},${y} ${x},${y + 2.8} ${x - 2.8},${y}`}
                      fill={color}
                      stroke="#020617"
                      strokeWidth={0.4}
                    />
                  ) : node.type === 'cabinet' ? (
                    <rect
                      x={x - 2.4}
                      y={y - 2.4}
                      width={4.8}
                      height={4.8}
                      rx={0.6}
                      fill={color}
                      stroke="#020617"
                      strokeWidth={0.4}
                    />
                  ) : (
                    <circle
                      cx={x}
                      cy={y}
                      r={isFault ? 3.0 : isSelected ? 2.5 : 1.8}
                      fill={color}
                      stroke="#020617"
                      strokeWidth={0.4}
                    />
                  )}
                  
                  <title>{`${node.label || node.id} (${node.type.toUpperCase()})\nLat: ${node.lat.toFixed(4)}°\nLon: ${node.lon.toFixed(4)}°`}</title>
                </g>
              );
            })}

            {/* SVG Camera frustum / sight cone gradient definition */}
            <defs>
              <linearGradient id="minimap-cone-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                <stop offset="35%" stopColor="#22d3ee" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Dynamic camera sight line connecting camera coordinates to target controls lookup */}
            <line 
              id="minimap-cam-sight-line" 
              x1="0" 
              y1="0" 
              x2="0" 
              y2="0" 
              stroke="#22d3ee" 
              strokeWidth="0.8" 
              strokeDasharray="2,2" 
              strokeOpacity="0.85" 
            />

            {/* Focus target coordinate spotlight indicator */}
            <circle 
              id="minimap-cam-target" 
              cx="0" 
              cy="0" 
              r="2.5" 
              fill="#ef4444" 
              stroke="#ffffff" 
              strokeWidth="0.4" 
              opacity="0.9" 
            />

            {/* 3D camera coordinates dynamic marker and sight field-of-view cone */}
            <g id="minimap-cam-group" transform="translate(0, 0)">
              {/* Sight Cone */}
              <polygon points="0,0 24,-10 24,10" fill="url(#minimap-cone-gradient)" opacity="0.35" />
              <line x1="0" y1="0" x2="24" y2="-10" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.5" />
              <line x1="0" y1="0" x2="24" y2="10" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.5" />
              
              {/* Outer physical radar beacon circle */}
              <circle cx="0" cy="0" r="5.5" fill="none" stroke="#22d3ee" strokeWidth="0.6" strokeDasharray="1.5,1.5" className="animate-spin" style={{ animationDuration: '6s' }} />

              {/* Core Sensor Lens Node */}
              <circle cx="0" cy="0" r="1.6" fill="#f43f5e" />
              <polygon points="-1.5,-1.8 2.2,0 -1.5,1.8" fill="#22d3ee" />
            </g>
          </svg>

          {/* Symmetrical interactive hint display on hover */}
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-2 text-[8px] font-mono text-slate-300 z-20 pointer-events-none gap-1">
            <span className="text-[#38bdf8] font-bold uppercase">Click Node to Locate</span>
            <span className="text-slate-400">Centers 3D viewport on localized physical node</span>
          </div>
        </div>

        {/* Dynamic Zoom & Target Center-Lock Controls Row */}
        <div className="flex items-center justify-between gap-1 bg-slate-950/75 p-1.5 rounded-lg border border-slate-800/60 z-10 pointer-events-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimapZoom(prev => Math.max(0.5, Number((prev - 0.3).toFixed(1))))}
              className="w-5 h-5 bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-slate-850 rounded flex items-center justify-center text-[10px] text-slate-300 font-bold transition-all cursor-pointer shadow-sm select-none"
              title="Zoom out 2D mini-map overview"
              id="minimap-zoom-out"
            >
              -
            </button>
            <span className="text-[8.5px] text-slate-400 font-mono select-none px-0.5 min-w-[20px] text-center">
              {(minimapZoom).toFixed(1)}x
            </span>
            <button
              onClick={() => setMinimapZoom(prev => Math.min(3.5, Number((prev + 0.3).toFixed(1))))}
              className="w-5 h-5 bg-slate-900 border border-slate-800 hover:border-slate-700 active:bg-slate-850 rounded flex items-center justify-center text-[10px] text-slate-300 font-bold transition-all cursor-pointer shadow-sm select-none"
              title="Zoom in 2D mini-map view"
              id="minimap-zoom-in"
            >
              +
            </button>
          </div>
          
          <button
            onClick={() => setMinimapCenterLock(prev => !prev)}
            className={`px-1.5 py-0.5 text-[7.5px] rounded border font-mono transition-all uppercase flex items-center gap-1 cursor-pointer select-none ${
              minimapCenterLock
                ? 'bg-[#38bdf8]/15 border-[#38bdf8]/50 text-[#38bdf8] font-bold'
                : 'bg-slate-950 border-slate-800/80 text-slate-500'
            }`}
            title="Lock 2D map focus to selected 3D focus node"
            id="minimap-toggle-lock"
          >
            <span className={`w-1 h-1 rounded-full ${minimapCenterLock ? 'bg-[#38bdf8] animate-ping' : 'bg-slate-600'}`} />
            <span>Center Lock</span>
          </button>
        </div>

        {/* Nested GIS Projection Metadata inside selector box */}
        <div className="text-[9px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-normal space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500 uppercase">MATRIX SCALE:</span>
            <span className="text-white font-semibold">1:600</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 uppercase">Y-AXIS DATUM:</span>
            <span className="text-[#38bdf8] font-semibold">ELEVATED 3D</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 uppercase">SECTOR ACTIVE:</span>
            <span className="text-amber-450 font-bold">HO (HOMAGAMA)</span>
          </div>
        </div>
      </div>
        )
      )}

      {/* Floating collapsible Map Legend Accordion neatly positioned on bottom-right above the timeline controls bar */}
      {isGlobalHudVisible && (
        <div 
          className="absolute bottom-[98px] right-4 p-3 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl text-[10px] font-mono text-slate-300 shadow-2xl z-10 w-44 sm:w-52 pointer-events-auto select-none transition-all hover:border-[#38bdf8]/45 flex flex-col gap-1.5" 
          id="floating-map-legend"
          style={{ transform: `translate3d(${legendPos.x}px, ${legendPos.y}px, 0px)` }}
        >
          <div 
            onMouseDown={(e) => handleDragStart(e, 'legend')}
            onTouchStart={(e) => handleDragStart(e, 'legend')}
            className="flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-800/40 rounded px-1 -mx-1 transition-all group/hdr select-none py-0.5"
            title="Drag here to move map legend window"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLegendOpen(!isLegendOpen);
              }}
              className="flex items-center justify-between text-[9px] text-[#38bdf8] font-bold uppercase tracking-wider hover:text-white transition-colors cursor-pointer w-full focus:outline-none pointer-events-auto"
              id="btn-toggle-legend"
              title="Expand / collapse full 3D Map Symbology Legend"
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#38bdf8] inline-block rounded-full"></span>
                MAP LEGEND
              </span>
              <span className="font-mono text-[8.5px] text-slate-500 group-hover/hdr:text-[#38bdf8]">{isLegendOpen ? 'Collapse ▲' : 'Expand ▼'}</span>
            </button>
          </div>

          {isLegendOpen && (
            <div className="space-y-1.5 pt-1.5 max-h-[140px] overflow-y-auto pr-1 text-[9px] text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-700 border border-slate-500 rounded-sm" />
                <span>Structure Pole</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-sm" />
                <span>Distribution Point (DP)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-0.5 bg-teal-500/70" />
                <span>Cable Link (Normal)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-1 bg-[#38bdf8] shadow-[0_0_4px_rgba(56,189,248,0.5)]" />
                <span className="text-[#38bdf8]">Fiber Path</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-1 bg-[#fbbf24] shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
                <span className="text-[#fbbf24]">Copper Path</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-600 rounded-sm animate-pulse" />
                <span className="text-red-450 font-bold">Fault Alarm</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-dashed border-sky-400/80 bg-sky-500/10" />
                <span className="text-sky-400 font-semibold">500m Contact Range</span>
              </div>

              {heatmapActive && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1 mt-1 text-[8.5px]">
                  <div className="text-[8px] text-teal-400 font-bold uppercase tracking-wider mb-1">Sector Heatmap</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#10b981]/30 border border-[#10b981]/60 rounded-sm" />
                    <span>Nominal (&ge; 80%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-500/30 border border-amber-500/60 rounded-sm" />
                    <span>Compromised</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-rose-500/30 border border-rose-500/60 rounded-sm animate-pulse" />
                    <span className="text-[#f43f5e]">Degraded (&lt; 40%)</span>
                  </div>
                </div>
              )}

              {segmentHeatmapActive && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1 mt-1 text-[8.5px]">
                  <div className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Signal Strength</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-0.5 bg-[#10b981]" />
                    <span>Strong (&ge; 80 dB)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-0.5 bg-[#f59e0b]" />
                    <span>Congested / Weak</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-0.5 bg-[#f43f5e]" />
                    <span className="text-[#f43f5e]">Heavy Attenuation</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compass / High-tech GIS Coordinates Overlay HUD */}
      {isGlobalHudVisible && (
        !isGisHudOpen ? (
          <div 
            className="absolute top-4 left-4 z-10"
            style={{ transform: `translate3d(${gisPos.x}px, ${gisPos.y}px, 0px)` }}
          >
            <button
              onClick={() => setIsGisHudOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/95 backdrop-blur border border-teal-500/35 hover:border-teal-500/60 rounded-xl text-[9px] font-mono text-teal-305 font-bold uppercase transition-all shadow-xl cursor-pointer select-none"
              title="Expand GIS telemetry coordinates"
            >
              <span>📍 GIS TELEMETRY [Expand ▼]</span>
            </button>
          </div>
        ) : (
          <div 
            className="absolute top-4 left-4 p-3 bg-slate-900/90 backdrop-blur border border-teal-500/30 rounded-lg text-[11px] font-mono text-teal-400 select-none shadow-lg shadow-black/80 pointer-events-auto space-y-1.5 z-10 w-[210px]"
            style={{ transform: `translate3d(${gisPos.x}px, ${gisPos.y}px, 0px)` }}
          >
            <div 
              onMouseDown={(e) => handleDragStart(e, 'gis')}
              onTouchStart={(e) => handleDragStart(e, 'gis')}
              className="flex items-center justify-between border-b border-teal-500/20 pb-1 mb-1 cursor-grab active:cursor-grabbing select-none hover:bg-slate-800/40 rounded px-1 -mx-1 transition-all group/hdr"
              title="Drag here to move GIS telemetry viewport"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGisHudOpen(false);
                }}
                className="flex items-center space-x-1.5 text-teal-305 font-bold hover:text-white transition-colors cursor-pointer text-left focus:outline-none pointer-events-auto"
                title="Collapse GIS Viewport Details"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping inline-block" />
                <span>GIS VIEWPORT</span>
                <span className="text-[7.5px] text-teal-500 font-normal ml-0.5">▲</span>
              </button>
              <span className="text-[7.5px] font-mono text-teal-600 group-hover/hdr:text-teal-400 font-bold tracking-widest leading-none">:: DRAG</span>
            </div>
        <div>CENTER LAT: <span className="text-white">{centerLat.toFixed(5)}° N</span></div>
        <div>CENTER LON: <span className="text-white">{centerLon.toFixed(5)}° E</span></div>
        
        {/* Dynamic rotating 3D Compass widget block */}
        <div className="flex items-center justify-between gap-1 mt-2.5 mb-2 py-1.5 border-t border-b border-teal-500/15">
          <div className="space-y-0.5 max-w-[110px]">
            <span className="text-[8px] text-slate-500 font-bold block uppercase leading-none tracking-tight">GYRO ORIENTATION</span>
            <span className="text-[10px] text-[#38bdf8] font-bold block truncate font-mono" id="compass-heading-text">360.0° N</span>
            <span className="text-[8px] text-teal-500/70 block leading-none font-mono">DAMPENED</span>
          </div>
          
          {/* Compass layout with rotating ring */}
          <div className="relative w-11 h-11 rounded-full border border-teal-500/35 bg-slate-950 flex items-center justify-center shadow-md shadow-black/60 overflow-hidden shrink-0">
            {/* Outer Rotating Cardinal Ring */}
            <div 
              id="compass-dial-ring" 
              className="absolute inset-0 transition-transform duration-75 ease-out select-none pointer-events-none origin-center"
              style={{ transform: 'rotate(0deg)' }}
            >
              <span className="absolute top-0 right-0 left-0 text-center text-[7.5px] font-black text-rose-500 leading-none pt-0.5">N</span>
              <span className="absolute bottom-0.5 right-0 left-0 text-center text-[6px] font-bold text-slate-500 leading-none">S</span>
              <span className="absolute right-0.5 top-[18px] text-[6.5px] font-bold text-slate-500 leading-none">E</span>
              <span className="absolute left-0.5 top-[18px] text-[6.5px] font-bold text-slate-500 leading-none">W</span>
              {/* Decorative degree marks */}
              <div className="absolute inset-1 rounded-full border border-teal-500/10 border-dashed" />
            </div>

            {/* Glowing static pointer that elements rotate under */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <svg className="w-8 h-8 drop-shadow-[0_0_2px_rgba(56,189,248,0.7)]" viewBox="0 0 100 100">
                {/* 3D-effect sharp tactical arrow pointer */}
                <polygon points="50,12 59,48 50,42" fill="#38bdf8" />
                <polygon points="50,12 41,48 50,42" fill="#0284c7" />
                <polygon points="50,88 59,52 50,46" fill="#64748b" fillOpacity="0.4" />
                <polygon points="50,88 41,52 50,46" fill="#475569" fillOpacity="0.4" />
                <circle cx="50" cy="50" r="4.5" fill="#030712" />
                <circle cx="50" cy="50" r="1.5" fill="#14b8a6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div>ZOOM: <span className="text-neutral-400">MOUSE SCROLL</span></div>
          <div className="flex gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (viewMode === '2d') {
                  setSvgZoom(z => Math.max(0.6, z / 1.2));
                } else {
                  const canvas = document.querySelector('canvas');
                  if (canvas) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, clientX: window.innerWidth/2, clientY: window.innerHeight/2, bubbles: true }));
                }
              }}
              className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-[#38bdf8] font-bold rounded flex items-center justify-center pointer-events-auto shadow cursor-pointer border border-slate-700 hover:border-sky-500/50 transition-all"
              title="Zoom Out"
            >
              -
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (viewMode === '2d') {
                  setSvgZoom(z => Math.min(200.0, z * 1.2));
                } else {
                  const canvas = document.querySelector('canvas');
                  if (canvas) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, clientX: window.innerWidth/2, clientY: window.innerHeight/2, bubbles: true }));
                }
              }}
              className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-[#38bdf8] font-bold rounded flex items-center justify-center pointer-events-auto shadow cursor-pointer border border-slate-700 hover:border-sky-500/50 transition-all"
              title="Zoom In"
            >
              +
            </button>
          </div>
        </div>
        <div className="mt-1">ORBIT: <span className="text-neutral-400">LEFT DRAG</span></div>
        <div className="mt-1">PAN: <span className="text-neutral-400">RIGHT DRAG</span></div>
        
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            onClick={() => {
              onSelectNode(null);
              setResetKey(prev => prev + 1);
            }}
            className="col-span-2 py-1.5 px-1 bg-teal-500/10 hover:bg-teal-500/20 active:bg-teal-500/35 border border-teal-500/30 hover:border-teal-500/50 rounded text-[9px] font-mono text-teal-300 hover:text-teal-200 transition-all uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-teal-500/5"
            id="btn-reset-view"
            title="Restore original viewpoint settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET TELEMETRY VIEW</span>
          </button>

          <button
            onClick={() => {
              setHeatmapActive(prev => !prev);
            }}
            className={`py-1.5 px-1 border rounded text-[9px] font-mono transition-all uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
              heatmapActive
                ? 'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/40 text-orange-400 font-bold shadow-orange-500/5'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-300'
            }`}
            id="btn-toggle-heatmap"
            title="Toggle color-coded network sector health & fault proximity overlay"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SECTORS GRID</span>
          </button>

          <button
            onClick={() => {
              setSegmentHeatmapActive(prev => !prev);
            }}
            className={`py-1.5 px-1 border rounded text-[9px] font-mono transition-all uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
              segmentHeatmapActive
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-400 font-bold shadow-emerald-500/5'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-300'
            }`}
            id="btn-toggle-segment-heatmap"
            title="Toggle interactive color-coded segment-level signal strength & congestion overlay"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>SIGNAL HEATMAP</span>
          </button>

          <button
            onClick={() => {
              setOrbitActive(prev => !prev);
            }}
            className={`py-1.5 px-1 border rounded text-[9px] font-mono transition-all uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
              orbitActive
                ? 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-500/30 text-teal-300 font-bold shadow-teal-500/5'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-300'
            }`}
            id="btn-toggle-orbit"
            title="Toggle autonomous camera orbit spin mode"
          >
            <Orbit className="w-3.5 h-3.5 text-teal-400" />
            <span>ORBIT</span>
          </button>

          <button
            onClick={() => {
              setGeoZoomEnabled(prev => !prev);
            }}
            className={`py-1.5 px-1 border rounded text-[9px] font-mono transition-all uppercase flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
              geoZoomEnabled
                ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/40 text-sky-450 font-bold shadow-sky-500/5'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-300'
            }`}
            id="btn-toggle-geozoom"
            title="Toggle dynamic density reduction & distance-based label visibility focus"
          >
            <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
            <span>DENSITY</span>
          </button>
        </div>

        {/* Radar Settings Slider Control */}
        <div className="border-t border-teal-500/20 pt-2.5 mt-2.5 space-y-1.5 pointer-events-auto">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#38bdf8] font-bold uppercase tracking-wider">Radar Scan Speed</span>
            <span className="text-[9px] text-white font-mono font-bold bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
              {radarSpeed.toFixed(1)}x
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[8px] text-slate-500 font-bold">0.1x</span>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={radarSpeed}
              onChange={(e) => setRadarSpeed(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#38bdf8] border border-slate-800"
              title="Drag to calibrate mapping radar scan sweep speed multiplier"
            />
            <span className="text-[8px] text-slate-500 font-bold">3.0x</span>
          </div>
        </div>

        {/* Cinematic Flying Chamber Angle Presets */}
        <div className="border-t border-teal-500/20 pt-2.5 mt-2 space-y-1.5 pointer-events-auto">
          <span className="text-[9px] text-[#38bdf8] font-bold uppercase tracking-wider block">Camera Presets</span>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setCameraPreset('iso')}
              className={`py-1 px-0.5 text-[8.5px] rounded border font-sans font-medium transition-all cursor-pointer ${
                cameraPreset === 'iso'
                  ? 'bg-[#38bdf8]/20 border-[#38bdf8]/60 text-[#38bdf8] font-bold shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-750'
              }`}
              title="Classic 3D isometric view angle"
            >
              🗺️ ISO 3D
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={`py-1 px-0.5 text-[8.5px] rounded border font-sans font-medium transition-all cursor-pointer ${
                cameraPreset === 'top'
                  ? 'bg-[#38bdf8]/20 border-[#38bdf8]/60 text-[#38bdf8] font-bold shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-750'
              }`}
              title="Perfect top-down orthographic perspective mapping"
            >
              🛰️ 2D MAP
            </button>
            <button
              onClick={() => setCameraPreset('pov')}
              className={`py-1 px-0.5 text-[8.5px] rounded border font-sans font-medium transition-all cursor-pointer ${
                cameraPreset === 'pov'
                  ? 'bg-[#38bdf8]/20 border-[#38bdf8]/60 text-[#38bdf8] font-bold shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-750'
              }`}
              title="Close low-angle inspection view of active digital twin node"
            >
              👁️ POV NODE
            </button>
            <button
              onClick={() => setCameraPreset('cinematic')}
              className={`py-1 px-0.5 text-[8.5px] rounded border font-sans font-medium transition-all cursor-pointer ${
                cameraPreset === 'cinematic'
                  ? 'bg-[#38bdf8]/20 border-[#38bdf8]/60 text-[#38bdf8] font-bold shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-750'
              }`}
              title="Cinematic wide-orbit automated drone scan flyby"
            >
              🎬 DRONE FLY
            </button>
          </div>
        </div>

        {/* Electromagnetic Fields Signal Coverage Wave Grid Toggle */}
        <div className="border-t border-teal-500/20 pt-2.5 mt-2 flex items-center justify-between pointer-events-auto">
          <span className="text-[9px] text-[#38bdf8] font-bold uppercase tracking-wider block leading-none">Signal Layer</span>
          <button
            onClick={() => setSignalLayerActive(prev => !prev)}
            className={`py-0.5 px-2 rounded border text-[8px] font-mono leading-none transition-all cursor-pointer ${
              signalLayerActive
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {signalLayerActive ? 'ACTIVE' : 'MUTED'}
          </button>
        </div>
      </div>
        )
      )}

      {/* Playback Control Bar - Scrubbing historical fault data recorded over the last 24 hours */}
      <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-900/95 backdrop-blur border border-slate-800/80 rounded-lg text-[11px] font-mono text-slate-300 shadow-2xl pointer-events-auto z-10 flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 bg-[#38bdf8]/10 rounded border border-[#38bdf8]/20 flex items-center justify-center">
              <Clock className={`w-3.5 h-3.5 ${playbackHourAgo > 0 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block leading-none">TELECOM HISTORY INSPECTOR</span>
              <span className="text-xs font-bold text-[#38bdf8] block tracking-wide mt-1">
                {playbackHourAgo === 0 ? 'LIVE STATUS TELEMETRY' : `${playbackHourAgo} HOURS AGO`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setIsPlaybackPlaying(!isPlaybackPlaying)}
              className={`p-1 px-2.5 rounded font-bold uppercase text-[9px] flex items-center gap-1 cursor-pointer transition-colors ${
                isPlaybackPlaying
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35 hover:bg-amber-500/30 shadow shadow-amber-550/10'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 shadow shadow-emerald-550/5'
              }`}
              title={isPlaybackPlaying ? "Pause auto-advancing" : "Auto-advance history loop"}
              id="playback-play-pause-btn"
            >
              {isPlaybackPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              <span>{isPlaybackPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => {
                setPlaybackHourAgo(0);
                setIsPlaybackPlaying(false);
              }}
              className={`p-1 px-2.5 rounded text-[9px] font-semibold cursor-pointer transition-colors ${
                playbackHourAgo === 0
                  ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Switch timeline preview back to Live streams"
              disabled={playbackHourAgo === 0}
              id="playback-go-live-btn"
            >
              RESET TO LIVE
            </button>

            <span className="text-[8px] text-slate-500 font-bold px-1 ml-0.5">SPEED:</span>
            <div className="flex bg-slate-950/80 p-0.5 rounded border border-slate-800">
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[8px] cursor-pointer font-black transition-all ${
                    playbackSpeed === s
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={`Speed multiplier: ${s} hours per step`}
                  id={`playback-speed-${s}x`}
                >
                  {s}X
                </button>
              ))}
            </div>

            {/* Master HUD Toggle Button */}
            <div className="h-4 w-[1px] bg-slate-800 mx-1.5 hidden sm:block" />
            
            <button
              onClick={() => setIsGlobalHudVisible(!isGlobalHudVisible)}
              className={`p-1 px-2.5 rounded text-[9.5px] font-bold cursor-pointer transition-all flex items-center gap-1.5 focus:outline-none border shadow-md ${
                isGlobalHudVisible
                  ? 'bg-slate-950/85 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 animate-pulse'
              }`}
              title="Toggle HUD: Hide or show all maps, coordinates, charts and indicators on the screen [Shortcut: H]"
              id="playback-toggle-hud-btn"
            >
              {isGlobalHudVisible ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>HIDE HUD [H]</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>SHOW HUD [H]</span>
                </>
              )}
            </button>

            {/* Reset HUD Positions Button */}
            <button
              onClick={resetHudPositions}
              className="p-1 px-2 rounded text-[9.5px] font-bold cursor-pointer transition-all flex items-center gap-1 bg-slate-950/85 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 focus:outline-none shadow-md"
              title="Reset all draggable HUD components to their default layout positions"
              id="playback-reset-hud-btn"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>SNAP HUD</span>
            </button>
          </div>

        </div>

        {/* Range Slider for granular scrubbing */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 font-bold shrink-0 select-none">24h ago</span>
            
            <div className="relative flex-1 py-1">
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={24 - playbackHourAgo}
                onChange={(e) => {
                  setPlaybackHourAgo(24 - Number(e.target.value));
                }}
                className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                style={{
                  background: `linear-gradient(to right, #0891b2 0%, #0891b2 ${((24 - playbackHourAgo) / 24) * 100}%, #020617 ${((24 - playbackHourAgo) / 24) * 100}%, #020617 100%)`
                }}
                id="playback-scrub-timeline"
                title="Scrub timeline from 24 Hours Ago to Live Now"
              />
              
              {/* Timeline markings */}
              <div className="flex justify-between text-[8px] text-slate-600 px-0.5 mt-0.5 select-none font-bold">
                <span>-24h ago</span>
                <span>-18h</span>
                <span>-12h (Halfway)</span>
                <span>-6h</span>
                <span className={playbackHourAgo === 0 ? "text-emerald-400" : "text-slate-500"}>LIVE NOW</span>
              </div>
            </div>
            
            <span className={`text-[9px] font-bold shrink-0 select-none ${playbackHourAgo === 0 ? "text-emerald-400" : "text-slate-500"}`}>Live</span>
          </div>

          {/* Active timeline event info card */}
          <div className="bg-slate-950/80 border border-slate-900/60 rounded p-1.5 px-2.5 text-[10px] text-slate-300 leading-relaxed transition-all flex items-start gap-2.5 min-h-[38px]">
            {playbackHourAgo > 0 ? (
              <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1 animate-pulse" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
            )}
            <div className="min-w-0 flex-1">
              <span className="font-bold text-[#38bdf8] uppercase tracking-wider text-[9.5px]">
                {HISTORICAL_TIMELINE[playbackHourAgo]?.title || 'UNRECOGNIZED LOG ENTRY'}
              </span>
              <span className="text-slate-500 mx-1">—</span>
              <span className="text-slate-400 text-[10px] italic">
                {HISTORICAL_TIMELINE[playbackHourAgo]?.desc || 'No logged telemetry comments for this historical window.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GLOBAL FLOATING ZOOM CONTROLS (Right Edge, below Minimap) */}
      <div className="absolute top-[60%] right-6 flex flex-col gap-3 z-50 pointer-events-none">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (viewMode === '2d') {
              setSvgZoom(z => Math.min(200.0, z * 1.2));
            } else {
              const canvas = document.querySelector('canvas');
              if (canvas) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -500, clientX: window.innerWidth/2, clientY: window.innerHeight/2, bubbles: true }));
            }
          }}
          className="w-12 h-12 bg-slate-900/95 hover:bg-slate-800 text-[#38bdf8] text-2xl font-bold rounded-xl flex items-center justify-center pointer-events-auto shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer border border-sky-500/40 hover:border-sky-400 transition-all backdrop-blur-md"
          title="Zoom In"
        >
          +
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (viewMode === '2d') {
              setSvgZoom(z => Math.max(0.6, z / 1.2));
            } else {
              const canvas = document.querySelector('canvas');
              if (canvas) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, clientX: window.innerWidth/2, clientY: window.innerHeight/2, bubbles: true }));
            }
          }}
          className="w-12 h-12 bg-slate-900/95 hover:bg-slate-800 text-[#38bdf8] text-2xl font-bold rounded-xl flex items-center justify-center pointer-events-auto shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer border border-sky-500/40 hover:border-sky-400 transition-all backdrop-blur-md"
          title="Zoom Out"
        >
          −
        </button>
      </div>

    </div>
  );
}
