"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * LiyaAvatar — The 3D AI Avatar orb with voice-reactive animations.
 * 
 * @param {Object} props
 * @param {boolean} props.isSpeaking - Whether the avatar is currently speaking
 * @param {boolean} props.isListening - Whether the avatar is listening to user
 * @param {boolean} props.isThinking - Whether the avatar is processing/thinking
 * @param {number} props.audioLevel - Audio amplitude level (0-1) for voice visualization
 * @param {string} props.agentColor - Hex color of the current agent
 */
export default function LiyaAvatar({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  audioLevel = 0,
}) {
  const coreRef = useRef();
  const glowRef = useRef();
  const ringRef = useRef();
  const particlesRef = useRef();

  // Generate particle positions
  const particleCount = 200;
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 1.2;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  // Core shader material
  const coreMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAudioLevel: { value: 0 },
          uIsSpeaking: { value: 0 },
          uIsListening: { value: 0 },
          uColor1: { value: new THREE.Color("#0052cc") },
          uColor2: { value: new THREE.Color("#00c853") },
          uColor3: { value: new THREE.Color("#2684ff") },
        },
        vertexShader: `
        uniform float uTime;
        uniform float uAudioLevel;
        uniform float uIsSpeaking;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;
        
        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          vNormal = normal;
          vPosition = position;
          
          // Multi-frequency noise displacement
          float speed = 0.4 + uIsSpeaking * 0.6;
          float noise1 = snoise(position * 2.0 + uTime * speed) * 0.15;
          float noise2 = snoise(position * 4.0 + uTime * speed * 1.5) * 0.08;
          float noise3 = snoise(position * 8.0 + uTime * speed * 2.0) * 0.04;
          
          // Audio-reactive displacement
          float audioDisp = uAudioLevel * 0.3 * uIsSpeaking;
          float displacement = noise1 + noise2 + noise3 + audioDisp;
          
          vDisplacement = displacement;
          
          vec3 newPosition = position + normal * displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
        fragmentShader: `
        uniform float uTime;
        uniform float uAudioLevel;
        uniform float uIsSpeaking;
        uniform float uIsListening;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;
        
        void main() {
          // Dynamic color mixing based on state and position
          float mixFactor = sin(vPosition.y * 3.0 + uTime * 0.5) * 0.5 + 0.5;
          float audioMix = uAudioLevel * uIsSpeaking;
          
          vec3 color = mix(uColor1, uColor2, mixFactor);
          color = mix(color, uColor3, audioMix * 0.5);
          
          // Listening state: greener tint
          color = mix(color, vec3(0.0, 0.8, 0.33), uIsListening * 0.3);
          
          // Fresnel glow effect
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
          
          // Add displacement-based brightness
          float brightness = 0.6 + vDisplacement * 2.0 + fresnel * 0.8;
          brightness += audioMix * 0.3;
          
          color *= brightness;
          
          // Add subtle glow at edges
          color += fresnel * uColor3 * 0.4;
          
          gl_FragColor = vec4(color, 0.95);
        }
      `,
        transparent: true,
      }),
    []
  );

  // Glow material
  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAudioLevel: { value: 0 },
          uColor: { value: new THREE.Color("#2684ff") },
        },
        vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        uniform float uTime;
        uniform float uAudioLevel;
        uniform vec3 uColor;
        varying vec3 vNormal;
        
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
          intensity *= pulse + uAudioLevel * 0.3;
          gl_FragColor = vec4(uColor, intensity * 0.6);
        }
      `,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );

  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Update core uniforms
    if (coreRef.current) {
      coreMaterial.uniforms.uTime.value = time;
      coreMaterial.uniforms.uAudioLevel.value = audioLevel;
      coreMaterial.uniforms.uIsSpeaking.value = isSpeaking ? 1.0 : 0.0;
      coreMaterial.uniforms.uIsListening.value = isListening ? 1.0 : 0.0;

      // Breathing animation
      const breathe = Math.sin(time * 1.2) * 0.03 + 1.0;
      const speakScale = isSpeaking ? 1.0 + audioLevel * 0.15 : 1.0;
      const thinkPulse = isThinking
        ? 0.95 + Math.sin(time * 4) * 0.05
        : 1.0;
      const scale = breathe * speakScale * thinkPulse;
      coreRef.current.scale.setScalar(scale);

      // Gentle rotation
      coreRef.current.rotation.y = time * 0.15;
      coreRef.current.rotation.x = Math.sin(time * 0.3) * 0.1;
    }

    // Update glow
    if (glowRef.current) {
      glowMaterial.uniforms.uTime.value = time;
      glowMaterial.uniforms.uAudioLevel.value = audioLevel;

      const glowScale = 1.15 + (isSpeaking ? audioLevel * 0.1 : 0);
      glowRef.current.scale.setScalar(glowScale);
    }

    // Rotate ring
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.5;
      ringRef.current.rotation.x = Math.sin(time * 0.2) * 0.3 + 0.5;

      const ringOpacity = isThinking ? 0.8 : isSpeaking ? 0.5 : 0.2;
      ringRef.current.material.opacity = ringOpacity;
    }

    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.1;
      particlesRef.current.rotation.x = Math.sin(time * 0.15) * 0.2;

      const positions = particlesRef.current.geometry.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const originalR = Math.sqrt(
          positions.array[ix] ** 2 +
            positions.array[ix + 1] ** 2 +
            positions.array[ix + 2] ** 2
        );
        if (originalR > 0) {
          const audioEffect = isSpeaking ? audioLevel * 0.3 : 0;
          const breathEffect = Math.sin(time * 1.2 + i * 0.1) * 0.05;
          const scaleFactor =
            (1 + breathEffect + audioEffect) / (originalR > 0 ? 1 : 1);
          // Subtle orbital movement
          const angle = time * 0.2 + i * 0.03;
          positions.array[ix] +=
            Math.sin(angle) * 0.002 * (isSpeaking ? 3 : 1);
          positions.array[ix + 1] +=
            Math.cos(angle * 0.7) * 0.002 * (isSpeaking ? 3 : 1);
        }
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Core orb */}
      <mesh ref={coreRef} material={coreMaterial}>
        <icosahedronGeometry args={[1, 64]} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef} material={glowMaterial}>
        <icosahedronGeometry args={[1.2, 32]} />
      </mesh>

      {/* Orbiting ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.8, 0.02, 16, 100]} />
        <meshBasicMaterial
          color="#2684ff"
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Second ring */}
      <mesh rotation={[Math.PI / 3, 0, Math.PI / 4]}>
        <torusGeometry args={[2.0, 0.015, 16, 100]} />
        <meshBasicMaterial
          color="#00c853"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Floating particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#2684ff"
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Ambient light for depth */}
      <ambientLight intensity={0.2} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#2684ff" />
      <pointLight position={[-5, -3, 3]} intensity={0.4} color="#00c853" />
    </group>
  );
}
