'use client';

import React, { Suspense, useState, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Float, 
  Text, 
  MeshDistortMaterial, 
  Sphere, 
  Box,
  Cylinder,
  ContactShadows,
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// --- Sub-components for products ---

const RouterModel = ({ hovered }) => (
  <group>
    {/* Main Body */}
    <mesh castShadow>
      <boxGeometry args={[1.2, 0.3, 0.8]} />
      <meshStandardMaterial color={hovered ? "#2684ff" : "#ffffff"} metalness={0.9} roughness={0.1} />
    </mesh>
    {/* Antennas */}
    {[ -0.4, 0, 0.4 ].map((x, i) => (
      <mesh key={i} position={[x, 0.4, -0.3]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    ))}
    {/* LED Lights */}
    <mesh position={[0, 0.16, 0.35]}>
      <boxGeometry args={[0.8, 0.02, 0.05]} />
      <meshBasicMaterial color="#00d4ff" />
    </mesh>
  </group>
);

const HubModel = ({ hovered }) => (
  <group>
    <mesh castShadow>
      <cylinderGeometry args={[0.5, 0.5, 0.2, 32]} />
      <meshStandardMaterial color={hovered ? "#00c853" : "#f0f0f0"} metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.12, 0]}>
      <cylinderGeometry args={[0.45, 0.45, 0.05, 32]} />
      <meshBasicMaterial color="#0052cc" />
    </mesh>
  </group>
);

const SwitchModel = ({ hovered }) => (
  <group>
    <mesh castShadow>
      <boxGeometry args={[1.5, 0.2, 1]} />
      <meshStandardMaterial color={hovered ? "#ffab00" : "#222"} metalness={1} roughness={0.2} />
    </mesh>
    {/* Ports */}
    {Array.from({ length: 8 }).map((_, i) => (
      <mesh key={i} position={[-0.6 + i * 0.18, 0, 0.51]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshBasicMaterial color="#444" />
      </mesh>
    ))}
  </group>
);

const ProductRack = ({ position, label, color, type, onSelect }) => {
  const [hovered, setHover] = useState(false);

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group 
        position={position}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onClick={() => onSelect(label)}
      >
        {/* Glow behind product */}
        <mesh position={[0, 0, -0.2]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={hovered ? 0.15 : 0.05} 
            side={THREE.DoubleSide} 
          />
        </mesh>

        {/* Product Model */}
        <group rotation={[0.2, -0.4, 0]}>
          {type === 'router' && <RouterModel hovered={hovered} />}
          {type === 'hub' && <HubModel hovered={hovered} />}
          {type === 'switch' && <SwitchModel hovered={hovered} />}
        </group>

        {/* Info Tag */}
        <Html position={[0, -1, 0]} center distanceFactor={10}>
          <div style={{
            background: 'rgba(10, 14, 26, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '8px 16px',
            borderRadius: '20px',
            border: `1px solid ${hovered ? color : 'rgba(255,255,255,0.1)'}`,
            color: 'white',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            transition: 'all 0.3s ease',
            transform: `scale(${hovered ? 1.1 : 1})`,
            boxShadow: hovered ? `0 0 20px ${color}44` : 'none'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>{label}</span>
          </div>
        </Html>
      </group>
    </Float>
  );
};

// --- Main VR Shop Component ---

const VRTeleshop = ({ onProductSelect, isKiosk = false }) => {
  const [cameraPos, setCameraPos] = useState([0, 2, 8]);
  const [targetPos, setTargetPos] = useState([0, 0, 0]);
  const bgTexture = useLoader(THREE.TextureLoader, '/assets/vr-bg.png');

  const flyTo = (pos, target = [0, 0, 0]) => {
    setCameraPos(pos);
    setTargetPos(target);
  };

  const handleProductClick = (label) => {
    if (onProductSelect) onProductSelect(label);
    
    if (label === "Fiber Router") flyTo([-4, 1, 4], [-4, 0, 0]);
    if (label === "Smart Home Hub") flyTo([0, 1, 4], [0, 0, 0]);
    if (label === "Enterprise Switch") flyTo([4, 1, 4], [4, 0, 0]);
  };

  return (
    <div className="w-full h-screen bg-[#0a0e1a] relative overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={cameraPos} fov={50} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={3} 
          maxDistance={15} 
          target={targetPos}
          maxPolarAngle={Math.PI / 2}
        />
        
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <spotLight 
          position={[0, 10, 0]} 
          intensity={2} 
          angle={0.5} 
          penumbra={1} 
          castShadow 
          color="#2684ff"
        />
        
        <Suspense fallback={null}>
          {/* 360 Environment Sphere */}
          <mesh>
            <sphereGeometry args={[20, 64, 64]} />
            <meshBasicMaterial map={bgTexture} side={THREE.BackSide} />
          </mesh>

          {/* Reflective Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial 
              color="#050810" 
              metalness={0.9} 
              roughness={0.1} 
              transparent 
              opacity={0.8}
            />
          </mesh>

          <ContactShadows 
            position={[0, -1.99, 0]} 
            opacity={0.4} 
            scale={20} 
            blur={2} 
            far={4.5} 
          />

          {/* Product Racks */}
          <group position={[0, 0, -2]}>
            <ProductRack 
              position={[-4, 0.5, 0]} 
              color="#0052cc" 
              label="Fiber Router" 
              type="router"
              onSelect={handleProductClick} 
            />
            <ProductRack 
              position={[0, 0.5, 0]} 
              color="#2684ff" 
              label="Smart Home Hub" 
              type="hub"
              onSelect={handleProductClick} 
            />
            <ProductRack 
              position={[4, 0.5, 0]} 
              color="#00c853" 
              label="Enterprise Switch" 
              type="switch"
              onSelect={handleProductClick} 
            />
          </group>

          {/* Decorative Tech Elements */}
          <Float speed={2} rotationIntensity={0.5}>
            <mesh position={[0, 5, -8]}>
              <torusGeometry args={[3, 0.02, 16, 100]} />
              <meshBasicMaterial color="#0052cc" transparent opacity={0.3} />
            </mesh>
          </Float>

          <Environment preset="night" />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute top-10 left-10 z-10 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
            SLT <span className="text-[#2684ff]">NEXUS</span> <br/>
            <span className="text-2xl not-italic font-light tracking-[0.5em] text-slate-500">VR TELESOP</span>
          </h1>
          <div className="h-1 w-20 bg-[#2684ff] mt-4" />
        </motion.div>
      </div>

      {/* Back Button */}
      <button 
        onClick={() => window.location.reload()} // Simple way to go back for now
        className="absolute bottom-10 left-10 z-20 px-6 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white text-xs font-bold tracking-widest uppercase transition-all"
      >
        ← Return to AI Avatar
      </button>

      {/* Navigation Help */}
      <div className="absolute bottom-10 right-10 z-10 text-right text-slate-500 text-[10px] uppercase tracking-[0.2em]">
        Drag to Orbit • Scroll to Zoom • Click Products to Inspect
      </div>
    </div>
  );
};

export default VRTeleshop;
