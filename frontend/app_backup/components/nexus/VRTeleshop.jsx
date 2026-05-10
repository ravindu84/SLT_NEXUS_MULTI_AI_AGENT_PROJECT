'use client';

import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, Text, MeshDistortMaterial, Sphere, Box } from '@react-three/drei';
import { motion } from 'framer-motion-3d';

const Product = ({ position, color, label, onSelect }) => {
  const [hovered, setHover] = useState(false);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group 
        position={position}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onClick={() => onSelect(label)}
      >
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={hovered ? '#00c853' : color} metalness={0.8} roughness={0.2} />
        </mesh>
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
};

const VRTeleshop = ({ onProductSelect, isKiosk = false }) => {
  const [cameraPos, setCameraPos] = useState([0, 2, 10]);
  const [targetPos, setTargetPos] = useState([0, 0, 0]);

  const flyTo = (pos, target = [0, 0, 0]) => {
    setCameraPos(pos);
    setTargetPos(target);
  };

  const handleProductClick = (label) => {
    if (onProductSelect) onProductSelect(label);
    
    // Animate camera based on product
    if (label === "Fiber Router") flyTo([-3, 2, 5], [-3, 0, 0]);
    if (label === "Smart Home Hub") flyTo([0, 2, 5], [0, 0, 0]);
    if (label === "Wi-Fi Extender") flyTo([3, 2, 5], [3, 0, 0]);
  };

  return (
    <div className="w-full h-screen bg-[#0a0e1a]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={cameraPos} />
        <OrbitControls 
          enableDamping 
          minDistance={2} 
          maxDistance={20} 
          target={targetPos}
        />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={[512, 512]} castShadow />
        
        <Suspense fallback={null}>
          {/* Virtual Floor */}
          {!isKiosk && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
              <planeGeometry args={[100, 100]} />
              <meshStandardMaterial color="#111827" transparent opacity={0.8} />
            </mesh>
          )}

          {/* Futuristic Displays */}
          <Product position={[-3, 0, 0]} color="#0052cc" label="Fiber Router" onSelect={handleProductClick} />
          <Product position={[0, 0, 0]} color="#2684ff" label="Smart Home Hub" onSelect={handleProductClick} />
          <Product position={[3, 0, 0]} color="#00c853" label="Wi-Fi Extender" onSelect={handleProductClick} />

          {/* Avatar Area */}
          <Float speed={1} rotationIntensity={0.2}>
             <Sphere args={[1, 64, 64]} position={[0, 3, -5]}>
                <MeshDistortMaterial
                  color="#0052cc"
                  speed={2}
                  distort={0.4}
                  radius={1}
                />
             </Sphere>
          </Float>

          <Environment preset="city" />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute top-10 left-10 z-10">
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
          SLT <span className="text-slt-blue">NEXUS</span> VR
        </h1>
        <p className="text-slate-400 mt-2">Welcome to the Virtual Teleshop</p>
      </div>
    </div>
  );
};

export default VRTeleshop;
