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
      camera={{ position: [0, 0, 4.5], fov: 45 }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <Environment preset="city" />
        <LiyaAvatar
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking}
          audioLevel={audioLevel}
        />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        maxPolarAngle={Math.PI / 1.7}
        minPolarAngle={Math.PI / 2.3}
      />
    </Canvas>
  );
}
