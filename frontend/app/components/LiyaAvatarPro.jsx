"use client";

import { useRef, useEffect, useState } from "react";
import { useGLTF, useAnimations, Center } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * LiyaAvatarPro Component
 * Uses liya_2.glb with full morph-target based lip sync (A-I-U-E-O / Large / Blink)
 */
export default function LiyaAvatarPro({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  audioLevel = 0,
  manualOverride = false,
  overrideValues = {
    mouthOpen: 0,
    mouthO: 0,
    mouthI: 0,
    mouthLarge: 0,
    blink: 0,
    joy: 0,
  }
}) {
  const group = useRef();
  const [modelReady, setModelReady] = useState(false);
  
  // 1. Load the maya.glb model
  const { scene, animations } = useGLTF("/assets/maya.glb");
  const { actions } = useAnimations(animations, group);

  // Apply visual refinements and natural arms-down posture
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
          if (child.material) {
            // Premium double-sided rendering
            child.material.side = THREE.DoubleSide;
            
            // Fix transparency issues (hair, eyelashes, saree/clothing edges)
            if (child.material.transparent || child.material.alphaMap) {
              child.material.transparent = true;
              child.material.alphaTest = 0.5; 
              child.material.depthWrite = true;
            }
            
            // Boost material aesthetics with slight roughness adjustments
            if (child.material.name.toLowerCase().includes("skin") || child.material.name.toLowerCase().includes("face")) {
              child.material.roughness = 0.6;
              child.material.metalness = 0.1;
            }
          }
        }
        
        // Drop the arms from T-pose to natural elegant rest position
        if (child.isBone) {
          const name = child.name;
          if (name === "J_Bip_L_UpperArm") {
            child.rotation.z = -1.35;
            child.rotation.y = 0.1;
          }
          if (name === "J_Bip_R_UpperArm") {
            child.rotation.z = 1.35;
            child.rotation.y = -0.1;
          }
          if (name === "J_Bip_L_LowerArm") {
            child.rotation.y = 0.25;
          }
          if (name === "J_Bip_R_LowerArm") {
            child.rotation.y = -0.25;
          }
        }
      });
    }
  }, [scene]);

  const wrapperRef = useRef();

  useEffect(() => {
    if (scene && wrapperRef.current) {
      wrapperRef.current.rotation.set(0, 0, 0); 
      
      // Scale: optimized for liya_2.glb with X widened to 9.4 to make her fuller and "piripun" (not skinny)
      wrapperRef.current.scale.set(9.4, 8.2, 8.5);

      // Position: adjusted Y offset to align waist-up portrait perfectly in camera view
      wrapperRef.current.position.set(0, -4.4, 0);

      setModelReady(true);
      console.log("LIYA 2.0 (Pro) Transforms Applied Safely.");
    }
  }, [scene]);

  useFrame((state) => {
    if (!modelReady) return;
    const time = state.clock.elapsedTime;
    
    // Normalize audio level to 0-1 range.
    // When speaking is true but no active mic audio, we create a lively simulated level
    const level = isSpeaking 
      ? (audioLevel > 0 ? Math.min(1, audioLevel * 2.8) : (0.4 + Math.sin(time * 12) * 0.4)) 
      : 0;
    
    // Dynamic blinking (fast blink every few seconds)
    const blinkLevel = Math.sin(time * 2.5) > 0.96 ? 1.0 : 0.0;

    scene.traverse((child) => {
      // 1. Dynamic arm posture (resting + gestures when speaking)
      if (child.isBone) {
        const name = child.name;
        
        let targetZ = 0;
        let targetY = 0;
        let targetX = 0;

        if (name === "J_Bip_L_UpperArm") {
          // Lift arms slightly forward and up
          targetZ = -1.35 + (isSpeaking ? 0.3 + Math.sin(time * 2.5) * level * 0.1 : 0);
          targetX = (isSpeaking ? 0.4 + Math.cos(time * 1.5) * level * 0.1 : 0);
          targetY = 0.1;
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetZ, 0.08);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetX, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetY, 0.08);
        }
        if (name === "J_Bip_R_UpperArm") {
          targetZ = 1.35 - (isSpeaking ? 0.3 + Math.cos(time * 2.2) * level * 0.1 : 0);
          targetX = (isSpeaking ? 0.4 + Math.sin(time * 1.8) * level * 0.1 : 0);
          targetY = -0.1;
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetZ, 0.08);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetX, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetY, 0.08);
        }
        if (name === "J_Bip_L_LowerArm") {
          // Bend elbow forward towards chest (positive X / Z)
          targetZ = (isSpeaking ? 1.5 + Math.abs(Math.sin(time * 3.0) * level * 0.2) : 0);
          targetY = 0.25;
          targetX = 0;
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetZ, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetY, 0.08);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetX, 0.08);
        }
        if (name === "J_Bip_R_LowerArm") {
          targetZ = (isSpeaking ? -1.5 - Math.abs(Math.cos(time * 3.2) * level * 0.2) : 0);
          targetY = -0.25;
          targetX = 0;
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetZ, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetY, 0.08);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetX, 0.08);
        }
      }

      if (child.isMesh && child.morphTargetDictionary) {
        
        const mthAIndex = child.morphTargetDictionary["Fcl_MTH_A"];
        const mthOIndex = child.morphTargetDictionary["Fcl_MTH_O"];
        const mthIIndex = child.morphTargetDictionary["Fcl_MTH_I"];
        const mthUIndex = child.morphTargetDictionary["Fcl_MTH_U"];
        const mthEIndex = child.morphTargetDictionary["Fcl_MTH_E"];
        const mthLargeIndex = child.morphTargetDictionary["Fcl_MTH_Large"];
        const mthDownIndex = child.morphTargetDictionary["Fcl_MTH_Down"];
        const eyeCloseIndex = child.morphTargetDictionary["Fcl_EYE_Close"];
        const eyeCloseRIndex = child.morphTargetDictionary["Fcl_EYE_Close_R"];
        const eyeCloseLIndex = child.morphTargetDictionary["Fcl_EYE_Close_L"];
        const joyIndex = child.morphTargetDictionary["Fcl_ALL_Joy"] || child.morphTargetDictionary["Fcl_MTH_Joy"];

        if (manualOverride) {
          // --- MANUAL CONTROL MODE ---
          if (mthAIndex !== undefined) child.morphTargetInfluences[mthAIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthAIndex], overrideValues.mouthOpen || 0, 0.3);
          if (mthOIndex !== undefined) child.morphTargetInfluences[mthOIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthOIndex], overrideValues.mouthO || 0, 0.3);
          if (mthIIndex !== undefined) child.morphTargetInfluences[mthIIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthIIndex], overrideValues.mouthI || 0, 0.3);
          if (mthLargeIndex !== undefined) child.morphTargetInfluences[mthLargeIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthLargeIndex], overrideValues.mouthLarge || 0, 0.3);
          if (eyeCloseIndex !== undefined) {
            child.morphTargetInfluences[eyeCloseIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[eyeCloseIndex], overrideValues.blink || 0, 0.3);
          } else {
            if (eyeCloseRIndex !== undefined) child.morphTargetInfluences[eyeCloseRIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[eyeCloseRIndex], overrideValues.blink || 0, 0.3);
            if (eyeCloseLIndex !== undefined) child.morphTargetInfluences[eyeCloseLIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[eyeCloseLIndex], overrideValues.blink || 0, 0.3);
          }
          if (joyIndex !== undefined) child.morphTargetInfluences[joyIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[joyIndex], overrideValues.joy || 0, 0.3);
        } else {
          // --- AUTOMATIC SPEECH/ANIMATION MODE ---
          // Blinking
          if (eyeCloseIndex !== undefined) {
            child.morphTargetInfluences[eyeCloseIndex] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[eyeCloseIndex],
              blinkLevel,
              0.35
            );
          } else {
            if (eyeCloseRIndex !== undefined) child.morphTargetInfluences[eyeCloseRIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[eyeCloseRIndex], blinkLevel, 0.35);
            if (eyeCloseLIndex !== undefined) child.morphTargetInfluences[eyeCloseLIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[eyeCloseLIndex], blinkLevel, 0.35);
          }

          // Lip-Sync morphs (A, E, I, O, U, Large, Down)
          if (isSpeaking && level > 0.02) {
            const phonemeCycle = Math.floor(time * 10) % 6;
            const targetA = phonemeCycle === 0 ? level * 0.85 : level * 0.1;
            const targetE = phonemeCycle === 1 ? level * 0.75 : level * 0.1;
            const targetI = phonemeCycle === 2 ? level * 0.65 : level * 0.1;
            const targetO = phonemeCycle === 3 ? level * 0.8 : level * 0.1;
            const targetU = phonemeCycle === 4 ? level * 0.55 : level * 0.1;
            const targetLarge = phonemeCycle === 5 ? level * 0.45 : level * 0.15;

            if (mthAIndex !== undefined) child.morphTargetInfluences[mthAIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthAIndex], targetA, 0.25);
            if (mthEIndex !== undefined) child.morphTargetInfluences[mthEIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthEIndex], targetE, 0.25);
            if (mthOIndex !== undefined) child.morphTargetInfluences[mthOIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthOIndex], targetO, 0.25);
            if (mthIIndex !== undefined) child.morphTargetInfluences[mthIIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthIIndex], targetI, 0.25);
            if (mthUIndex !== undefined) child.morphTargetInfluences[mthUIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthUIndex], targetU, 0.25);
            if (mthLargeIndex !== undefined) child.morphTargetInfluences[mthLargeIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthLargeIndex], targetLarge, 0.25);
            if (mthDownIndex !== undefined) child.morphTargetInfluences[mthDownIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthDownIndex], level * 0.2, 0.2);
          } else {
            if (mthAIndex !== undefined) child.morphTargetInfluences[mthAIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthAIndex], 0, 0.25);
            if (mthOIndex !== undefined) child.morphTargetInfluences[mthOIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthOIndex], 0, 0.25);
            if (mthIIndex !== undefined) child.morphTargetInfluences[mthIIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthIIndex], 0, 0.25);
            if (mthUIndex !== undefined) child.morphTargetInfluences[mthUIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthUIndex], 0, 0.25);
            if (mthEIndex !== undefined) child.morphTargetInfluences[mthEIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthEIndex], 0, 0.25);
            if (mthLargeIndex !== undefined) child.morphTargetInfluences[mthLargeIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthLargeIndex], 0, 0.25);
            if (mthDownIndex !== undefined) child.morphTargetInfluences[mthDownIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[mthDownIndex], 0, 0.25);
          }

          // Smiling / expression
          if (joyIndex !== undefined) {
            const targetJoy = isListening ? 0.35 : (isSpeaking ? 0.15 : 0.25);
            child.morphTargetInfluences[joyIndex] = THREE.MathUtils.lerp(child.morphTargetInfluences[joyIndex], targetJoy, 0.1);
          }
        }
      }
    });

    // 4. Subtle Head and Body Swaying
    if (wrapperRef.current) {
      // Natural breathing + talking sway
      const targetRotY = isSpeaking ? (Math.sin(time * 1.5) * 0.06) : (Math.sin(time * 0.35) * 0.025);
      wrapperRef.current.rotation.y = THREE.MathUtils.lerp(wrapperRef.current.rotation.y, targetRotY, 0.05);
      
      const targetRotX = isSpeaking ? (0.015 + Math.sin(time * 0.8) * 0.01) : (Math.sin(time * 0.15) * 0.005);
      wrapperRef.current.rotation.x = THREE.MathUtils.lerp(wrapperRef.current.rotation.x, targetRotX, 0.05);

      // Subtle breathing translation (up and down)
      const targetPosY = -4.4 + Math.sin(time * 1.2) * 0.025;
      wrapperRef.current.position.y = THREE.MathUtils.lerp(wrapperRef.current.position.y, targetPosY, 0.05);
    }
  });

  // Start Idle Animations from GLB if present
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      // Play first animation (usually default idle/talking pose)
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
      <ambientLight intensity={1.8} />
      <directionalLight position={[0, 3, 4]} intensity={2.0} />
      <directionalLight position={[-3, 1, 2]} intensity={0.8} color="#94b9ff" />
      <directionalLight position={[3, 1, -2]} intensity={0.5} color="#ffd8a8" />
    </group>
  );
}

useGLTF.preload("/assets/maya.glb");
