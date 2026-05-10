"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import LiyaAvatar from "./LiyaAvatar";

export default function AvatarScene({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  audioLevel = 0,
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      gl={{ 
        antialias: true, 
        alpha: true, 
        powerPreference: "high-performance",
      }}
      flat
    >
      <Suspense fallback={null}>
        {/* 
          No Environment preset — it was adding dark reflections on the face.
          Using strong, even multi-directional lighting to eliminate all shadows.
        */}
        
        {/* Very strong ambient light to fill ALL shadows uniformly */}
        <ambientLight intensity={5} />
        
        {/* Front light — directly facing the avatar to illuminate the face */}
        <directionalLight position={[0, 2, 8]} intensity={3} color="#ffffff" />
        
        {/* Top-down fill light — eliminates forehead and under-eye shadows */}
        <directionalLight position={[0, 8, 2]} intensity={2.5} color="#ffffff" />
        
        {/* Left fill light */}
        <pointLight position={[-5, 2, 5]} intensity={3} color="#ffffff" />
        
        {/* Right fill light */}
        <pointLight position={[5, 2, 5]} intensity={3} color="#ffffff" />
        
        {/* Bottom fill — removes chin/neck shadows */}
        <pointLight position={[0, -3, 4]} intensity={2} color="#ffffff" />
        
        {/* Back fill light to prevent any dark areas */}
        <pointLight position={[0, 2, -5]} intensity={2} color="#ffffff" />

        <LiyaAvatar
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking}
          audioLevel={audioLevel}
        />
      </Suspense>
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        autoRotate={false}
        maxPolarAngle={Math.PI / 1.7}
        minPolarAngle={Math.PI / 2.3}
      />
    </Canvas>
  );
}
