"use client";

import { useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";

export default function LiyaAvatar() {
  const group = useRef();
  const { scene, animations } = useGLTF("/assets/liya.glb");
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions) {
      const idleAction = Object.values(actions)[0];
      if (idleAction) idleAction.reset().play();
    }
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }, [actions, scene]);

  return (
    <group ref={group} scale={[5, 5, 5]} position={[0, -6, 0]}>
      <ambientLight intensity={2.5} />
      <directionalLight position={[0, 1, 5]} intensity={2} />
      <pointLight position={[0, -1, 3]} intensity={1} color="#ffffff" />
      <primitive object={scene} />
    </group>
  );
}
