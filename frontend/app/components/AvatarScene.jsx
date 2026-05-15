"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
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
      key="liya-avatar-canvas"
      camera={{ position: [0, -0.2, 5.0], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      gl={{ 
        antialias: true, 
        alpha: true, 
        powerPreference: "high-performance",
      }}
    >
      <Suspense fallback={null}>
        {/* Reverted to studio which is cached/working, added warm light manually */}
        <Environment preset="studio" />
        <ambientLight intensity={0.6} color="#ffe8cc" />
        <directionalLight position={[0, 2, 5]} intensity={1.0} color="#ffedd6" />

        <LiyaAvatar
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking}
          audioLevel={audioLevel}
        />
      </Suspense>
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        enableRotate={true}
        minPolarAngle={Math.PI / 2 - 0.05} // Lock up/down movement
        maxPolarAngle={Math.PI / 2 + 0.05}
      />
    </Canvas>

  );
}
