import React, { Suspense, useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei/native';
import * as THREE from 'three';

// Use require for local assets in Expo
const modelUrl = require('../assets/maya.glb');

function MayaModel({ isSpeaking, audioLevel }) {
  const group = useRef();
  const [modelReady, setModelReady] = useState(false);
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      // Find 'idle' or play first
      let idleKey = Object.keys(actions).find(k => k.toLowerCase().includes('idle'));
      if (!idleKey) idleKey = Object.keys(actions)[0];
      if (idleKey && actions[idleKey]) {
        actions[idleKey].play();
      }
    }
  }, [actions]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
            if (child.material.transparent || child.material.alphaMap) {
              child.material.transparent = true;
              child.material.alphaTest = 0.5;
              child.material.depthWrite = true;
            }
          }
        }
        // Force arms down to fix T-pose
        if (child.isBone) {
          if (child.name.includes("L_Shoulder")) {
            child.rotation.z = -1.2;
          }
          if (child.name.includes("R_Shoulder")) {
            child.rotation.z = 1.2;
          }
          if (child.name.includes("L_UpperArm")) {
             child.rotation.z = -0.5;
          }
          if (child.name.includes("R_UpperArm")) {
             child.rotation.z = 0.5;
          }
        }
      });
      setModelReady(true);
    }
  }, [scene]);

  useFrame((state) => {
    if (!modelReady || !scene) return;
    const time = state.clock.elapsedTime;
    const level = isSpeaking ? (audioLevel > 0 ? Math.min(1, audioLevel * 3) : (0.5 + Math.sin(time * 15) * 0.5)) : 0;
    const blinkLevel = Math.sin(time * 3) > 0.95 ? 1 : 0;

    let appliedBlendshape = false;
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        for (const [key, index] of Object.entries(child.morphTargetDictionary)) {
          const lowerKey = key.toLowerCase();
          
          if (lowerKey.includes("mouth") || lowerKey.includes("jaw") || lowerKey.includes("lip")) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              level,
              0.2
            );
            appliedBlendshape = true;
          }
          
          if (lowerKey.includes("blink") || lowerKey.includes("eyeclose")) {
            child.morphTargetInfluences[index] = blinkLevel;
          }
        }
      }
    });

    if (!appliedBlendshape && group.current) {
      if (isSpeaking) {
        group.current.position.y = Math.sin(time * 10) * 0.05 - 8.5;
      } else {
        group.current.position.y = -8.5;
      }
    }
  });

  // Position specific for Mobile Viewport (Upper body framed)
  return <primitive ref={group} object={scene} scale={5.5} position={[0, -8.5, 0]} rotation={[0, 0, 0]} />;
}

export default function AvatarScene({ isSpeaking = false, audioLevel = 0 }) {
  return (
    <View style={styles.container}>
      <Canvas camera={{ position: [0, 0, 5.0], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.5} color="#ffffff" />
          <directionalLight position={[2, 5, 5]} intensity={2.5} color="#ffffff" />
          <directionalLight position={[-2, -5, -5]} intensity={0.5} color="#ffffff" />
          <Environment preset="city" />
          <MayaModel isSpeaking={isSpeaking} audioLevel={audioLevel} />
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
