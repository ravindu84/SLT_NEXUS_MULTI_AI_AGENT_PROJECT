"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Suspense } from "react";
import NeoAvatar from "./NeoAvatar";

export default function NeoAvatarScene({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  audioLevel = 0,
  manualOverride = false,
  overrideValues = {}
}) {
  return (
    <Canvas
      key="neo-avatar-canvas"
      camera={{ position: [0, -0.1, 4.6], fov: 42 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      gl={{ 
        antialias: true, 
        alpha: true, 
        powerPreference: "high-performance",
      }}
    >
      <Suspense fallback={null}>
        <Environment preset="studio" />
        <ambientLight intensity={0.6} color="#ffe8cc" />
        <directionalLight position={[0, 2, 5]} intensity={1.2} color="#ffedd6" />

        <NeoAvatar
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking}
          audioLevel={audioLevel}
          manualOverride={manualOverride}
          overrideValues={overrideValues}
        />
      </Suspense>
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        enableRotate={true}
        minPolarAngle={Math.PI / 2 - 0.08}
        maxPolarAngle={Math.PI / 2 + 0.08}
      />
    </Canvas>
  );
}
