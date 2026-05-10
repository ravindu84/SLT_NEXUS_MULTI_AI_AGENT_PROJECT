"use client";

import { useRef, useEffect, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

export default function LiyaAvatar() {
  const group = useRef();
  
  const { scene, animations } = useGLTF("/assets/liya.glb");
  const { actions } = useAnimations(animations, group);

  // Fix dark patches by converting all materials to MeshBasicMaterial (unlit)
  // This completely eliminates lighting-based shadows and normal-direction issues
  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        // Disable shadow casting and receiving
        child.castShadow = false;
        child.receiveShadow = false;
        
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          const newMats = mats.map((mat) => {
            // Create a new MeshBasicMaterial from the existing material
            // MeshBasicMaterial does NOT respond to lights at all — 
            // it simply displays the texture/color, eliminating ALL dark patches
            const basicMat = new THREE.MeshBasicMaterial({
              map: mat.map || null,                    // keep the color/diffuse texture
              color: mat.map ? 0xffffff : mat.color,   // use white if textured, or original color
              transparent: mat.transparent,
              opacity: mat.opacity,
              alphaMap: mat.alphaMap || null,
              side: THREE.DoubleSide,                   // render both sides to fix inverted normals
              alphaTest: mat.alphaTest || 0,
            });
            
            // Copy the name for debugging
            basicMat.name = mat.name;
            
            return basicMat;
          });
          
          child.material = newMats.length === 1 ? newMats[0] : newMats;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    if (actions) {
      const idleAction = Object.values(actions)[0]; 
      if (idleAction) {
        idleAction.reset().play(); 
      }
    }
  }, [actions]);

  return (
    <group ref={group} scale={[9, 9, 9]} position={[0, -7.0, 0]}>
      <primitive object={scene} />
    </group>
  );
}