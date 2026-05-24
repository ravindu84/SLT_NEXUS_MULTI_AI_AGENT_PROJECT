import React, { Suspense, useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Use require for local assets in Expo
const modelUrl = require('../assets/maya.glb');

function MayaModel({ isSpeaking, audioLevel }) {
  const group = useRef();
  const [modelReady, setModelReady] = useState(false);
  const { scene } = useGLTF(modelUrl);

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

    if (!appliedBlendshape && group.current) {
      if (isSpeaking) {
        group.current.position.y = Math.sin(time * 10) * 0.05 - 6.0;
      } else {
        group.current.position.y = -6.0;
      }
    }
  });

  // Position specific for Mobile Viewport
  return <primitive ref={group} object={scene} scale={7.5} position={[0, -6.0, 0]} rotation={[0, 0, 0]} />;
}

export default function AvatarScene({ isSpeaking = false, audioLevel = 0 }) {
  return (
    <View style={styles.container}>
      <Canvas camera={{ position: [0, -0.2, 5.0], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} color="#ffe8cc" />
          <directionalLight position={[0, 2, 5]} intensity={1.0} color="#ffedd6" />
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
