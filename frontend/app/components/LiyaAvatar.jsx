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
      
      // SCALE: Standard scale for full-screen customer app
      wrapperRef.current.scale.set(7.5, 7.5, 7.5);

      // POSITION: Original perfect position for customer app
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
          if (lowerKey.includes("mouth") || lowerKey.includes("jaw") || lowerKey.includes("lip") || lowerKey.includes("viseme")) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              level,
              0.2
            );
            appliedBlendshape = true;
          }
          
          // EYES / BLINK
          if (lowerKey.includes("blink") || lowerKey.includes("eyeclose")) {
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
    let appliedBone = false;
    if (!appliedBlendshape) {
      scene.traverse((child) => {
        if (child.isBone && child.name.toLowerCase().includes("jaw")) {
          // Make jaw open much wider (0.4 radians ~ 22 degrees)
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, level * 0.4, 0.2);
          appliedBone = true;
        }
      });
    }

    // 3. SKIN/LIP VIBRATION FALLBACK — Works even without morph targets or jaw bone!
    // This creates visible lip/chin movement by pulsing the Head bone's scale
    // and applying micro-displacement to face mesh vertices.
    if (!appliedBlendshape && !appliedBone) {
      scene.traverse((child) => {
        // 3a. Head/Neck bone scale pulse — makes chin area visibly "talk"
        if (child.isBone) {
          const boneName = child.name.toLowerCase();
          if (boneName.includes("head") || boneName === "head") {
            // Subtle Y-scale pulse synchronized with speech (1.0 → 1.012)
            const targetScaleY = isSpeaking ? (1.0 + level * 0.012) : 1.0;
            child.scale.y = THREE.MathUtils.lerp(child.scale.y, targetScaleY, 0.25);
            // Micro chin rotation for natural talking feel
            const chinPulse = isSpeaking ? (Math.sin(time * 12) * level * 0.03) : 0;
            child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, chinPulse, 0.2);
          }
          // Neck micro-movement adds realism
          if (boneName.includes("neck")) {
            const neckPulse = isSpeaking ? (Math.sin(time * 8) * level * 0.015) : 0;
            child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, neckPulse, 0.15);
          }
        }

        // 3b. Direct face mesh vertex micro-displacement — lips/skin physically vibrate
        if (child.isMesh && child.geometry) {
          const meshName = child.name.toLowerCase();
          // Target face/head/body meshes (most avatars have these)
          if (meshName.includes("face") || meshName.includes("head") || 
              meshName.includes("body") || meshName.includes("skin") ||
              meshName.includes("mesh") || meshName === "") {
            
            const geo = child.geometry;
            const posAttr = geo.attributes.position;
            
            // Store original positions once for safe reset
            if (!geo.userData.originalPositions) {
              geo.userData.originalPositions = new Float32Array(posAttr.array.length);
              geo.userData.originalPositions.set(posAttr.array);
            }
            
            if (isSpeaking && level > 0.05) {
              const original = geo.userData.originalPositions;
              // Only displace vertices in the lower-face region (chin/lip area)
              // We estimate this as vertices where Y is between -0.02 and 0.15 in local space
              for (let i = 0; i < posAttr.count; i++) {
                const oy = original[i * 3 + 1]; // original Y
                // Target lower-face vertices only (approximate lip/chin zone)
                if (oy > -0.05 && oy < 0.12) {
                  const wave = Math.sin(time * 14 + i * 0.3) * level * 0.0008;
                  posAttr.array[i * 3 + 1] = original[i * 3 + 1] + wave;
                }
              }
              posAttr.needsUpdate = true;
            } else if (geo.userData.originalPositions) {
              // Reset to original when not speaking
              posAttr.array.set(geo.userData.originalPositions);
              posAttr.needsUpdate = true;
            }
          }
        }
      });
    }

    // 4. Dynamic Rotation / Swaying based on dialogue
    if (wrapperRef.current) {
      // When speaking, she makes slightly larger head/body movements. When idle, very slow breathing sway.
      const targetRotY = isSpeaking ? (Math.sin(time * 1.2) * 0.08) : (Math.sin(time * 0.3) * 0.03);
      wrapperRef.current.rotation.y = THREE.MathUtils.lerp(wrapperRef.current.rotation.y, targetRotY, 0.05);
      
      // Subtle breathing translation
      const targetPosY = -6.0 + Math.sin(time * 1.2) * 0.025;
      wrapperRef.current.position.y = THREE.MathUtils.lerp(wrapperRef.current.position.y, targetPosY, 0.05);
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
