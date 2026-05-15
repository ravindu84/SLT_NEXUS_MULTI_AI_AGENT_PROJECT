"use client";

import { useRef, useEffect, useState } from "react";
import { useGLTF, useAnimations, Center } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * LiyaAvatar Component
 * VIEWPORT-LOCKED VERSION
 */
export default function LiyaAvatar({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  audioLevel = 0,
}) {
  const group = useRef();
  const [modelReady, setModelReady] = useState(false);
  
  // 1. Load the model
  const { scene, animations } = useGLTF("/assets/liya.glb");
  const { actions } = useAnimations(animations, group);

  // Fix transparency sorting issues and frustum culling
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
          if (child.material) {
            // Make materials double-sided to prevent invisible back-faces
            child.material.side = THREE.DoubleSide;
            
            // Fix black patches/glitches on transparent textures (hair, eyelashes, saree)
            if (child.material.transparent || child.material.alphaMap) {
              child.material.transparent = true;
              child.material.alphaTest = 0.5; // This cuts out the weird black boxes
              child.material.depthWrite = true;
            }
          }
        }
      });
    }
  }, [scene]);

  // 3. THE "WRAPPER" POSITION FIX
  const wrapperRef = useRef();

  useEffect(() => {
    if (scene && wrapperRef.current) {
      wrapperRef.current.rotation.set(0, 0, 0); 
      
      // SCALE: Carefully balanced to 6.85 (not skinny, not crushed at the edges)
      wrapperRef.current.scale.set(6.85, 6.85, 6.85);

      // POSITION: Brought down slightly as requested
      wrapperRef.current.position.set(0, -6.0, 0);

      setModelReady(true);
      console.log("LIYA: Wrapper Transforms Applied Safely.");
    }
  }, [scene]);

  useFrame((state) => {
    if (!modelReady) return;
    const time = state.clock.elapsedTime;
    
    // Make the fake speech level much larger (0 to 1) so it's clearly visible
    const level = isSpeaking ? (audioLevel > 0 ? Math.min(1, audioLevel * 3) : (0.5 + Math.sin(time * 15) * 0.5)) : 0;
    
    // Random eye blinking (blinks quickly every few seconds)
    const blinkLevel = Math.sin(time * 3) > 0.95 ? 1 : 0;

    // Lip Sync (Blendshapes / Morph Targets + Fallback)
    let appliedBlendshape = false;
    scene.traverse((child) => {
      // 1. Try Morph Targets (Blendshapes from Blender)
      if (child.isMesh && child.morphTargetDictionary) {
        
        // Log the keys once so the user can see them in F12 console
        if (!child.userData.keysLogged) {
          console.log("LIYA Morph Targets (Shape Keys) Found:", Object.keys(child.morphTargetDictionary));
          child.userData.keysLogged = true;
        }

        for (const [key, index] of Object.entries(child.morphTargetDictionary)) {
          const lowerKey = key.toLowerCase();
          
          // MOUTH / JAW
          if (lowerKey.includes("mouth") || lowerKey.includes("jaw") || lowerKey.includes("lip") || lowerKey.includes("viseme") || lowerKey.includes("key")) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              level,
              0.2
            );
            appliedBlendshape = true;
          }
          
          // EYES / BLINK
          if (lowerKey.includes("eye") || lowerKey.includes("blink")) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              blinkLevel,
              0.3
            );
          }
        }
      }
    });

    // 2. Fallback to Bone if no blendshapes exist for mouth
    if (!appliedBlendshape) {
      scene.traverse((child) => {
        if (child.isBone && child.name.toLowerCase().includes("jaw")) {
          // Make jaw open much wider (0.4 radians ~ 22 degrees)
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, level * 0.4, 0.2);
        }
      });
    }

    // 3. Dynamic Rotation / Swaying based on dialogue
    if (wrapperRef.current) {
      // When speaking, she makes slightly larger head/body movements. When idle, very slow breathing sway.
      const targetRotY = isSpeaking ? (Math.sin(time * 1.2) * 0.08) : (Math.sin(time * 0.3) * 0.03);
      wrapperRef.current.rotation.y = THREE.MathUtils.lerp(wrapperRef.current.rotation.y, targetRotY, 0.05);
      
      // Slight leaning forward when speaking
      const targetRotX = isSpeaking ? 0.02 : 0;
      wrapperRef.current.rotation.x = THREE.MathUtils.lerp(wrapperRef.current.rotation.x, targetRotX, 0.05);
    }
  });

  // Start Animation
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const action = Object.values(actions)[0];
      if (action) action.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  if (!scene) return null;

  return (
    <group ref={wrapperRef}>
      <group ref={group}>
        <Center>
          <primitive object={scene} dispose={null} />
        </Center>
      </group>
      <ambientLight intensity={2} />
      <directionalLight position={[0, 2, 5]} intensity={2} />
    </group>
  );
}

useGLTF.preload("/assets/liya.glb");