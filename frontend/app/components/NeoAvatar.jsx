"use client";

import { useRef, useEffect, useState } from "react";
import { useGLTF, useAnimations, Center } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * NeoAvatar Component
 * Uses neo.glb with full morph-target based lip sync (A-I-U-E-O / Large / Blink)
 * Male avatar counterpart to Maya/Liya
 */
export default function NeoAvatar({
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
  },
  isAdmin = false
}) {
  const group = useRef();
  const [modelReady, setModelReady] = useState(false);
  
  // 1. Load the neo.glb model
  const { scene, animations } = useGLTF("/assets/neo.glb");
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
            
            // Fix transparency issues (hair, clothing edges)
            if (child.material.transparent || child.material.alphaMap) {
              child.material.transparent = true;
              child.material.alphaTest = 0.5; 
              child.material.depthWrite = true;
            }
            
            // Apply natural warm skin tone to Neo (reduce pale/white appearance)
            const matName = child.material.name.toLowerCase();
            if (matName.includes("skin") || matName.includes("face") || matName.includes("body")) {
              child.material.roughness = 0.65;
              child.material.metalness = 0.05;
              // Warm up the skin color slightly — natural male skin tone
              if (child.material.color) {
                const currentColor = child.material.color;
                // Blend towards a warmer skin tone (reduce the white/pale look)
                currentColor.lerp(new THREE.Color(0xD4A574), 0.18);
              }
              // Reduce any emissive glow that makes skin look washed out
              if (child.material.emissive) {
                child.material.emissiveIntensity = Math.min(child.material.emissiveIntensity, 0.05);
              }
            }
          }
        }
        
        // Drop the arms to natural hanging position (like a real person standing)
        if (child.isBone) {
          const name = child.name;
          if (name === "J_Bip_L_UpperArm") {
            child.rotation.z = -1.55;  // Arms close to body (almost straight down)
            child.rotation.x = 0.05;   // Very slight forward angle
            child.rotation.y = 0.05;
          }
          if (name === "J_Bip_R_UpperArm") {
            child.rotation.z = 1.55;
            child.rotation.x = 0.05;
            child.rotation.y = -0.05;
          }
          if (name === "J_Bip_L_LowerArm") {
            child.rotation.y = 0.12;   // Slight natural elbow bend
            child.rotation.z = 0.08;
          }
          if (name === "J_Bip_R_LowerArm") {
            child.rotation.y = -0.12;
            child.rotation.z = -0.08;
          }
        }
      });
    }
  }, [scene]);

  const wrapperRef = useRef();

  useEffect(() => {
    if (scene && wrapperRef.current) {
      wrapperRef.current.rotation.set(0, 0, 0); 
      
      let baseScale = 6.85;
      let baseY = -4.2;

      if (isAdmin) {
        baseScale = 4.0;
        baseY = -3.2;
      } else {
        baseScale = 6.85;
        baseY = -4.2;
      }

      wrapperRef.current.userData = { baseY };
      wrapperRef.current.scale.set(baseScale, baseScale, baseScale);
      wrapperRef.current.position.set(0, baseY, 0);

      setModelReady(true);
      console.log("NEO Avatar Transforms Applied Safely.");
    }
  }, [scene]);

  useFrame((state) => {
    if (!modelReady) return;
    const time = state.clock.elapsedTime;
    
    // Normalize audio level to 0-1 range.
    const level = isSpeaking 
      ? (audioLevel > 0 ? Math.min(1, audioLevel * 2.8) : (0.4 + Math.sin(time * 12) * 0.4)) 
      : 0;
    
    // Dynamic blinking
    const blinkLevel = Math.sin(time * 2.5) > 0.96 ? 1.0 : 0.0;

    scene.traverse((child) => {
      // 1. Dynamic arm posture (resting + gestures when speaking)
      if (child.isBone) {
        const name = child.name;
        
        let targetZ = 0;
        let targetY = 0;
        let targetX = 0;

        if (name === "J_Bip_L_UpperArm") {
          targetZ = -1.55 + (isSpeaking ? 0.05 + Math.sin(time * 2.5) * level * 0.05 : 0);
          targetX = 0.05 + (isSpeaking ? 0.05 + Math.cos(time * 1.5) * level * 0.05 : 0);
          targetY = 0.05;
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetZ, 0.08);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetX, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetY, 0.08);
        }
        if (name === "J_Bip_R_UpperArm") {
          targetZ = 1.55 - (isSpeaking ? 0.05 + Math.cos(time * 2.2) * level * 0.05 : 0);
          targetX = 0.05 + (isSpeaking ? 0.05 + Math.sin(time * 1.8) * level * 0.05 : 0);
          targetY = -0.05;
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetZ, 0.08);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetX, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetY, 0.08);
        }
        if (name === "J_Bip_L_LowerArm") {
          targetZ = 0.08 + (isSpeaking ? Math.abs(Math.sin(time * 3.0) * level * 0.1) : 0);
          targetY = 0.12;
          targetX = 0;
          child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, targetZ, 0.08);
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetY, 0.08);
          child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, targetX, 0.08);
        }
        if (name === "J_Bip_R_LowerArm") {
          targetZ = -0.08 - (isSpeaking ? Math.abs(Math.cos(time * 3.2) * level * 0.1) : 0);
          targetY = -0.12;
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
      const targetRotY = isSpeaking ? (Math.sin(time * 1.5) * 0.06) : (Math.sin(time * 0.35) * 0.025);
      wrapperRef.current.rotation.y = THREE.MathUtils.lerp(wrapperRef.current.rotation.y, targetRotY, 0.05);
      
      const targetRotX = isSpeaking ? (0.015 + Math.sin(time * 0.8) * 0.01) : (Math.sin(time * 0.15) * 0.005);
      wrapperRef.current.rotation.x = THREE.MathUtils.lerp(wrapperRef.current.rotation.x, targetRotX, 0.05);

      // Subtle breathing translation
      const baseY = wrapperRef.current.userData.baseY || -4.4;
      const targetPosY = baseY + Math.sin(time * 1.2) * 0.025;
      wrapperRef.current.position.y = THREE.MathUtils.lerp(wrapperRef.current.position.y, targetPosY, 0.05);
    }
  });

  // Start Idle Animations from GLB if present
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
      <ambientLight intensity={1.8} />
      <directionalLight position={[0, 3, 4]} intensity={2.0} />
      <directionalLight position={[-3, 1, 2]} intensity={0.8} color="#94b9ff" />
      <directionalLight position={[3, 1, -2]} intensity={0.5} color="#ffd8a8" />
    </group>
  );
}

useGLTF.preload("/assets/neo.glb");
