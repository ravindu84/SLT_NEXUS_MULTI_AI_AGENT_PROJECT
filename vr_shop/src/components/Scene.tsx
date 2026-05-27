import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Environment, MeshDistortMaterial, Edges, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// ==========================================
// 1. NEON LAMP POST
// ==========================================
const NeonLamp = () => {
    const [hovered, setHovered] = useState(false);
    const sltTextRef = useRef<any>(null);
    const sltPanelRef = useRef<THREE.MeshBasicMaterial>(null);
    const fiberTextRef = useRef<any>(null);
    const fiberPanelRef = useRef<THREE.MeshBasicMaterial>(null);
    const sltLightRef = useRef<THREE.PointLight>(null);
    const fiberLightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        // Subtle pulsate effect for neon
        const pulse = Math.sin(time * 3) * 0.1 + 0.9; // 0.8 to 1.0
        
        if (sltTextRef.current && sltPanelRef.current) {
            sltTextRef.current.fillOpacity = pulse;
            sltPanelRef.current.opacity = pulse * 0.8;
            sltPanelRef.current.transparent = true;
            if (sltLightRef.current) sltLightRef.current.intensity = pulse * 2;
        }

        if (fiberTextRef.current && fiberPanelRef.current) {
            fiberTextRef.current.fillOpacity = pulse;
            fiberPanelRef.current.opacity = pulse * 0.8;
            fiberPanelRef.current.transparent = true;
            if (fiberLightRef.current) fiberLightRef.current.intensity = pulse * 1.5;
        }
    });

    return (
        <group position={[-4, 0, 3]}>
            {/* Main Pole */}
            <mesh position={[0, 2.5, 0]}>
                <cylinderGeometry args={[0.08, 0.1, 5, 16]} />
                <meshStandardMaterial color="#111" roughness={0.7} metalness={0.8} />
            </mesh>
            
            {/* Branches */}
            <mesh position={[-0.4, 3.5, 0]} rotation={[0, 0, Math.PI/3]}>
                <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0.4, 4.0, 0]} rotation={[0, 0, -Math.PI/3]}>
                <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
                <meshStandardMaterial color="#222" />
            </mesh>

            {/* Glowing Orbs */}
            <Float speed={2} floatIntensity={0.2}>
                <mesh position={[-0.8, 3.7, 0]}>
                    <sphereGeometry args={[0.4, 16, 16]} />
                    <meshBasicMaterial color="#ff00ff" />
                </mesh>
                <pointLight position={[-0.8, 3.7, 0]} color="#ff00ff" intensity={6} distance={6} />
                <mesh position={[-0.8, 3.7, 0]}>
                    <sphereGeometry args={[0.5, 16, 16]} />
                    <meshBasicMaterial color="#ff00ff" transparent opacity={0.3} />
                </mesh>

                <mesh position={[0.8, 4.2, 0]}>
                    <sphereGeometry args={[0.4, 16, 16]} />
                    <meshBasicMaterial color="#ff00ff" />
                </mesh>
                <pointLight position={[0.8, 4.2, 0]} color="#ff00ff" intensity={6} distance={6} />
                <mesh position={[0.8, 4.2, 0]}>
                    <sphereGeometry args={[0.5, 16, 16]} />
                    <meshBasicMaterial color="#ff00ff" transparent opacity={0.3} />
                </mesh>
            </Float>

            {/* Street Signs */}
            <group position={[0, 2.2, 0.1]}>
                <mesh position={[0, 0, 0]} rotation={[0, 0.2, 0]}>
                    <boxGeometry args={[1.5, 0.3, 0.05]} />
                    <meshStandardMaterial color="#0f172a" />
                </mesh>
                <group
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
                >
                    <mesh position={[0, 0, -0.02]} rotation={[0, 0.2, 0]}>
                        <boxGeometry args={[1.6, 0.35, 0.02]} />
                        <meshBasicMaterial ref={sltPanelRef} color={hovered ? "#ffffff" : "#00ffff"} />
                    </mesh>
                    <Text ref={sltTextRef} position={[0, 0, 0.03]} rotation={[0, 0.2, 0]} fontSize={0.15} color={hovered ? "#ffffff" : "#00ffff"}>
                        SLT-MOBITEL
                    </Text>
                    <pointLight ref={sltLightRef} position={[0, 0, 0.1]} color={hovered ? "#ffffff" : "#00ffff"} intensity={2} distance={3} />
                </group>

                <mesh position={[0.2, -0.5, 0]} rotation={[0, -0.2, 0]}>
                    <boxGeometry args={[1.2, 0.3, 0.05]} />
                    <meshStandardMaterial color="#0f172a" />
                </mesh>
                <mesh position={[0.2, -0.5, -0.02]} rotation={[0, -0.2, 0]}>
                    <boxGeometry args={[1.3, 0.35, 0.02]} />
                    <meshBasicMaterial ref={fiberPanelRef} color="#0088ff" />
                </mesh>
                <Text ref={fiberTextRef} position={[0.2, -0.5, 0.03]} rotation={[0, -0.2, 0]} fontSize={0.15} color="#0088ff" letterSpacing={0.1}>
                    FIBER
                </Text>
                <pointLight ref={fiberLightRef} position={[0.2, -0.5, 0.1]} color="#0088ff" intensity={1.5} distance={3} />
            </group>
        </group>
    );
};

// ==========================================
// INTERACTIVE CONSOLE
// ==========================================
const InteractiveConsole = () => {
    const [hovered, setHovered] = useState(false);
    const hologramRef = useRef<THREE.Mesh>(null);
    const hologramGroupRef = useRef<THREE.Group>(null);
    const hologramLightRef = useRef<THREE.PointLight>(null);
    const buttonRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (hologramGroupRef.current) {
            const targetScale = hovered ? 1.15 : 1.0;
            hologramGroupRef.current.scale.x = THREE.MathUtils.lerp(hologramGroupRef.current.scale.x, targetScale, 0.1);
            hologramGroupRef.current.scale.y = THREE.MathUtils.lerp(hologramGroupRef.current.scale.y, targetScale, 0.1);
            hologramGroupRef.current.scale.z = THREE.MathUtils.lerp(hologramGroupRef.current.scale.z, targetScale, 0.1);
        }
        if (hologramRef.current) {
            hologramRef.current.rotation.y += 0.02;
            const targetOpacity = hovered ? (0.6 + Math.sin(state.clock.elapsedTime * 8) * 0.2) : (0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
            (hologramRef.current.material as THREE.Material).opacity = THREE.MathUtils.lerp(
                (hologramRef.current.material as THREE.Material).opacity,
                targetOpacity,
                0.1
            );
        }
        if (hologramLightRef.current) {
            const targetIntensity = hovered ? (3 + Math.sin(state.clock.elapsedTime * 8) * 1) : (0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.4);
            hologramLightRef.current.intensity = THREE.MathUtils.lerp(
                hologramLightRef.current.intensity,
                targetIntensity,
                0.1
            );
        }
        if (buttonRef.current) {
           (buttonRef.current.material as THREE.MeshBasicMaterial).color.setHex( Math.sin(state.clock.elapsedTime * 6) > 0 ? 0xff0055 : 0x220011 );
        }
    });

    return (
        <group position={[0, 1.25, 1.8]}>
            {/* Base Pad */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.8, 0.05, 0.4]} />
                <meshStandardMaterial color="#111" />
            </mesh>

            {/* Blinking Button */}
            <mesh ref={buttonRef} position={[-0.2, 0.05, 0.1]} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
                <cylinderGeometry args={[0.04, 0.04, 0.05, 16]} />
                <meshBasicMaterial color="#ff0055" />
            </mesh>
            <mesh position={[-0.05, 0.05, 0.1]}>
                <cylinderGeometry args={[0.04, 0.04, 0.05, 16]} />
                <meshBasicMaterial color="#00ffff" />
            </mesh>

            {/* Hologram Projector */}
            <mesh position={[0.2, 0.02, -0.05]}>
                <cylinderGeometry args={[0.1, 0.15, 0.05, 16]} />
                <meshStandardMaterial color="#333" />
                <pointLight color="#0044ff" intensity={0.5} distance={1} />
            </mesh>

            {/* Hologram */}
            <group 
                ref={hologramGroupRef}
                position={[0.2, 0.3, -0.05]} 
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
            >
                <mesh ref={hologramRef}>
                    <boxGeometry args={[0.2, 0.2, 0.2, 16, 16, 16]} />
                    <MeshDistortMaterial
                        color="#0066ff"
                        emissive="#0088ff"
                        emissiveIntensity={2}
                        transparent
                        opacity={0.4}
                        distort={0.4}
                        speed={3}
                    />
                </mesh>
                <pointLight ref={hologramLightRef} color="#0044ff" distance={3} />
                {hovered && (
                    <mesh>
                        <boxGeometry args={[0.22, 0.22, 0.22]} />
                        <meshBasicMaterial color="#0044ff" transparent opacity={0.2} />
                    </mesh>
                )}
            </group>
        </group>
    );
};

// ==========================================
// 2. CYBER KIOSK / PLATFORM
// ==========================================
interface KioskProps {
    bannerText?: string;
}
const Kiosk = ({ bannerText = "CYBER KIOSK" }: KioskProps) => {
    return (
        <group position={[0, 0, 0]}>
            {/* Main Shop Body */}
            <mesh position={[0, 1, 0]}>
                <boxGeometry args={[4, 2, 3]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.2} />
            </mesh>

            {/* Counter Section */}
            <mesh position={[0, 1.2, 1.6]}>
                <boxGeometry args={[4.2, 0.1, 1]} />
                <meshStandardMaterial color="#2d3748" metalness={0.8} />
            </mesh>
            {/* Glowing Edge on Counter */}
            <mesh position={[0, 1.2, 2.1]}>
                <boxGeometry args={[4.3, 0.05, 0.05]} />
                <meshBasicMaterial color="#00ffff" />
            </mesh>
            {/* Additional Neon Under-glow for Counter */}
            <mesh position={[0, 1.15, 2.1]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 4.3, 8]} />
                <meshBasicMaterial color="#ff00ff" />
            </mesh>
            <pointLight position={[0, 1.2, 2.3]} color="#00ffff" intensity={3} distance={4} />
            <pointLight position={[0, 1.1, 2.2]} color="#ff00ff" intensity={3} distance={4} />

            {/* Display Screen Left Side */}
            <group position={[-2.01, 1, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh>
                    <planeGeometry args={[2.5, 1.5]} />
                    <meshBasicMaterial color="#001133" />
                </mesh>
                <mesh position={[0, 0, 0.01]}>
                    <boxGeometry args={[2.4, 1.4, 0.01]} />
                    <meshBasicMaterial color="#0088ff" transparent opacity={0.1} />
                    <Edges color="#0088ff" />
                </mesh>
                {/* Tube light left/right */}
                <mesh position={[-1.2, 0, 0.02]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
                    <meshBasicMaterial color="#00ffff" />
                </mesh>
                <mesh position={[1.2, 0, 0.02]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
                    <meshBasicMaterial color="#00ffff" />
                </mesh>
                <Text position={[0, 0.4, 0.02]} fontSize={0.2} color="#00ffff">SLT-MOBITEL</Text>
                <Text position={[0, 0, 0.02]} fontSize={0.15} color="#ffffff">FIBER 1Gbps</Text>
                <Text position={[0, -0.4, 0.02]} fontSize={0.15} color="#ff00ff">PEO TV 4K</Text>
            </group>

            {/* Display Screen Right Side */}
            <group position={[2.01, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh>
                    <planeGeometry args={[2.5, 1.5]} />
                    <meshBasicMaterial color="#001133" />
                </mesh>
                <mesh position={[0, 0, 0.01]}>
                    <boxGeometry args={[2.4, 1.4, 0.01]} />
                    <meshBasicMaterial color="#ff00ff" transparent opacity={0.1} />
                    <Edges color="#ff00ff" />
                </mesh>
                {/* Tube light left/right */}
                <mesh position={[-1.2, 0, 0.02]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
                    <meshBasicMaterial color="#ff00ff" />
                </mesh>
                <mesh position={[1.2, 0, 0.02]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
                    <meshBasicMaterial color="#ff00ff" />
                </mesh>
                <Text position={[0, 0.4, 0.02]} fontSize={0.2} color="#ff00ff">SLT-MOBITEL</Text>
                <Text position={[0, 0, 0.02]} fontSize={0.15} color="#ffffff">5G READY</Text>
                <Text position={[0, -0.4, 0.02]} fontSize={0.15} color="#00ffff">UNLIMITED DATA</Text>
            </group>

            {/* Display Screen Back */}
            <group position={[0, 1.2, -1.51]} rotation={[0, Math.PI, 0]}>
                <mesh>
                    <planeGeometry args={[3.5, 1.8]} />
                    <meshBasicMaterial color="#110022" />
                </mesh>
                <mesh position={[0, 0, 0.01]}>
                    <boxGeometry args={[3.4, 1.7, 0.01]} />
                    <meshBasicMaterial color="#ff8800" transparent opacity={0.1} />
                    <Edges color="#ff8800" />
                </mesh>
                <mesh position={[-1.7, 0, 0.02]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
                    <meshBasicMaterial color="#ff8800" />
                </mesh>
                <mesh position={[1.7, 0, 0.02]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
                    <meshBasicMaterial color="#ff8800" />
                </mesh>
                <Text position={[0, 0.5, 0.02]} fontSize={0.3} color="#ff8800">SLT-MOBITEL</Text>
                <Text position={[0, -0.1, 0.02]} fontSize={0.2} color="#ffffff">THE CONNECTION</Text>
                <Text position={[0, -0.5, 0.02]} fontSize={0.15} color="#ff00ff">SMART HOME</Text>
            </group>

            {/* Awning / Roof */}
            <group position={[0, 2.5, 1.8]} rotation={[-0.2, 0, 0]}>
                {[-1.8, -0.6, 0.6, 1.8].map((x, i) => (
                    <mesh key={i} position={[x, 0, 0]}>
                        <boxGeometry args={[1, 0.1, 1.5]} />
                        <meshStandardMaterial color={i % 2 === 0 ? "#111" : "#222"} />
                    </mesh>
                ))}
                {/* Neon strip along the awning edge */}
                <mesh position={[0, -0.05, 0.75]}>
                    <boxGeometry args={[4.2, 0.05, 0.05]} />
                    <meshBasicMaterial color="#ff00ff" />
                </mesh>
            </group>

            {/* Main Banner Sign */}
            <Float speed={2} floatIntensity={0.1}>
                <group position={[0, 3.2, 1.5]}>
                    <mesh>
                        <boxGeometry args={[3.8, 0.8, 0.2]} />
                        <meshStandardMaterial color="#0b0f19" />
                    </mesh>
                    {/* Glowing Backboard / Border */}
                    <mesh position={[0, 0, -0.05]}>
                        <boxGeometry args={[3.9, 0.9, 0.1]} />
                        <meshBasicMaterial color="#00ffff" transparent opacity={0.1} />
                    </mesh>
                    {/* Neon Tubes Around Banner */}
                    <mesh position={[0, 0.45, 0.06]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.02, 0.02, 3.9, 8]} />
                        <meshBasicMaterial color="#ff00ff" />
                    </mesh>
                    <mesh position={[0, -0.45, 0.06]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.02, 0.02, 3.9, 8]} />
                        <meshBasicMaterial color="#00ffff" />
                    </mesh>
                    <Text position={[0, 0, 0.12]} fontSize={0.4} color="#ffffff">
                        {bannerText}
                    </Text>
                    <pointLight position={[0, 0, 0.5]} color="#00ffff" intensity={2} distance={5} />
                    <pointLight position={[0, 0.5, 0.2]} color="#ff00ff" intensity={3} distance={4} />
                </group>
            </Float>

            {/* Side Vertical Sign */}
            <group position={[-2.1, 2.2, 0]}>
                <mesh>
                    <boxGeometry args={[0.2, 2.5, 0.8]} />
                    <meshStandardMaterial color="#0b0f19" />
                </mesh>
                <mesh position={[-0.11, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[0.7, 2.4]} />
                    <meshBasicMaterial color="#001100" />
                </mesh>
                <group position={[-0.12, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <Text position={[0, 0.8, 0]} fontSize={0.25} color="#0088ff" letterSpacing={0.05}>
                        SLT
                    </Text>
                    <Text position={[0, 0.5, 0]} fontSize={0.18} color="#00bb00" letterSpacing={0.05}>
                        MOBITEL
                    </Text>
                    
                    {/* Glowing Box for OPEN */}
                    <mesh position={[0, -0.4, 0]}>
                        <planeGeometry args={[0.6, 0.4]} />
                        <meshBasicMaterial color="#00ff00" wireframe />
                    </mesh>
                    <Text position={[0, -0.4, 0]} fontSize={0.25} color="#00ff00" letterSpacing={0.1}>
                        OPEN
                    </Text>
                </group>
            </group>

            {/* Interactive Console on Counter */}
            <InteractiveConsole />

            {/* Stools / Counter Details */}
            {[-1, 0, 1].map((x) => (
                <group position={[x, 0, 2.4]} key={x}>
                    <mesh position={[0, 0.4, 0]}>
                        <cylinderGeometry args={[0.15, 0.15, 0.8, 16]} />
                        <meshStandardMaterial color="#2d3748" metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 0.8, 0]}>
                        <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
                        <meshBasicMaterial color="#ff8800" />
                    </mesh>
                </group>
            ))}

            {/* Roof Clutter (Wires, Dish, etc.) */}
            <group position={[0, 2, 0]}>
                {/* Tech Box */}
                <mesh position={[0, 0.5, -0.5]}>
                    <boxGeometry args={[1.5, 1, 1.5]} />
                    <meshStandardMaterial color="#1a1a2e" metalness={0.5} />
                </mesh>
                
                {/* Holographic / Glowing Bowl on Top */}
                <Float rotationIntensity={0.2} floatIntensity={0.5} speed={3}>
                    <mesh position={[0, 2, -0.5]}>
                        <sphereGeometry args={[0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshBasicMaterial color="#00ffff" wireframe />
                    </mesh>
                    {/* Floating rods inside bowl */}
                    <mesh position={[0, 2.2, -0.5]} rotation={[0, 0, Math.PI/6]}>
                        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
                        <meshBasicMaterial color="#ff00ff" />
                    </mesh>
                    <pointLight position={[0, 2, -0.5]} color="#00ffff" intensity={4} distance={6} />
                </Float>

                {/* Antenna */}
                <mesh position={[-1.2, 1.5, -1]}>
                    <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
                    <meshStandardMaterial color="#555" />
                </mesh>
                <mesh position={[-1.2, 2.5, -1]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshBasicMaterial color="#ff0000" />
                </mesh>
            </group>
        </group>
    );
}

// ==========================================
// 3. FLOOR AND INFO TEXT
// ==========================================
const HoverGlowText = ({ position, text, color = "#00ffff" }: {position: [number, number, number], text: string, color?: string}) => {
    const [hovered, setHovered] = useState(false);
    const textRef = useRef<any>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        if (!textRef.current) return;
        const time = state.clock.elapsedTime;
        const pulse = Math.sin(time * 5) * 0.2 + 0.8;
        
        if (hovered) {
            textRef.current.color = color;
            textRef.current.fillOpacity = pulse;
            if (lightRef.current) {
                lightRef.current.intensity = pulse * 1.5;
            }
        } else {
            textRef.current.color = "#cbd5e1";
            textRef.current.fillOpacity = 1;
            if (lightRef.current) {
                lightRef.current.intensity = 0;
            }
        }
    });

    return (
        <group position={position} 
               onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }} 
               onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}>
            <Text ref={textRef} fontSize={0.25} anchorX="left" letterSpacing={0.05} color="#cbd5e1">
                {text}
            </Text>
            <pointLight ref={lightRef} color={color} distance={2} intensity={0} position={[1, 0, 0.5]} />
            {/* Invisible interaction plane for better hit testing */}
            <mesh position={[1, 0, 0]} visible={false}>
                <planeGeometry args={[2.5, 0.4]} />
                <meshBasicMaterial />
            </mesh>
        </group>
    );
};

const DioramaFloor = () => {
    const gradientTexture = React.useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 2;
        const context = canvas.getContext('2d');
        if (context) {
            const gradient = context.createLinearGradient(0, 0, 256, 0);
            gradient.addColorStop(0, '#0088ff'); // Blue
            gradient.addColorStop(1, '#00ff44'); // Green
            context.fillStyle = gradient;
            context.fillRect(0, 0, 256, 2);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }, []);

    return (
        <group>
            {/* The infinite dark void floor */}
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.01, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#020205" roughness={0.2} metalness={0.8} />
            </mesh>
            
            {/* Grid Helper to give it a digital / cyber feel */}
            <gridHelper args={[50, 50, '#00F0FF', '#1e293b']} position={[0, 0, 0]} />

            {/* Glowing info text floating on floor */}
            <group position={[4, 0.05, 3]} rotation={[-Math.PI/2, 0, 0]}>
                <group position={[0, 0, 0]}>
                    <Text position={[0, 0, 0]} fontSize={0.8} color="#0088ff" anchorX="left">
                        SLT
                    </Text>
                    <Text position={[1.7, 0, 0]} fontSize={0.8} color="#00ff44" anchorX="left">
                        MOBITEL
                    </Text>
                </group>
                <HoverGlowText position={[0, -0.6, 0]} text="New connection" color="#00ff44" />
                <HoverGlowText position={[0, -1.0, 0]} text="VR Online Shop" color="#0088ff" />
                <HoverGlowText position={[0, -1.4, 0]} text="Faults Report" color="#ff00ff" />
                <HoverGlowText position={[0, -1.8, 0]} text="Mobile Plans" color="#00ff44" />
                <HoverGlowText position={[0, -2.2, 0]} text="Broadband" color="#0088ff" />
                <HoverGlowText position={[0, -2.6, 0]} text="TV Packages" color="#ef4444" />
            </group>
        </group>
    );
};

// ==========================================
// 4. TELECOM VEHICLE (CRANE TRUCK)
// ==========================================
const TelecomVehicle = () => {
    const blinkRef = useRef<THREE.MeshBasicMaterial[]>([]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const isBlinking = time % 1 > 0.5;
        blinkRef.current.forEach(mat => {
            if (mat) {
                mat.opacity = isBlinking ? 1 : 0.2;
                mat.transparent = true;
            }
        });
    });

    return (
        <group position={[6, 0, 0]} rotation={[0, -Math.PI / 6, 0]}>
            {/* Truck Body */}
            <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[1.2, 0.6, 3]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            {/* Cabin */}
            <mesh position={[0, 1.1, 1.1]}>
                <boxGeometry args={[1.1, 0.8, 0.8]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Cabin Windows */}
            <mesh position={[0, 1.2, 1.51]}>
                <boxGeometry args={[0.9, 0.4, 0.05]} />
                <meshStandardMaterial color="#00ffff" opacity={0.5} transparent />
            </mesh>
            
            {/* Blinking Headlights */}
            <mesh position={[-0.4, 0.4, 1.51]}>
                <boxGeometry args={[0.2, 0.15, 0.02]} />
                <meshBasicMaterial color="#ffffff" ref={(r) => { if(r) blinkRef.current[0] = r; }} />
            </mesh>
            <mesh position={[0.4, 0.4, 1.51]}>
                <boxGeometry args={[0.2, 0.15, 0.02]} />
                <meshBasicMaterial color="#ffffff" ref={(r) => { if(r) blinkRef.current[1] = r; }} />
            </mesh>

            {/* Blinking Taillights */}
            <mesh position={[-0.4, 0.4, -1.51]}>
                <boxGeometry args={[0.2, 0.15, 0.02]} />
                <meshBasicMaterial color="#ff0000" ref={(r) => { if(r) blinkRef.current[2] = r; }} />
            </mesh>
            <mesh position={[0.4, 0.4, -1.51]}>
                <boxGeometry args={[0.2, 0.15, 0.02]} />
                <meshBasicMaterial color="#ff0000" ref={(r) => { if(r) blinkRef.current[3] = r; }} />
            </mesh>

            {/* Front Text */}
            <Text position={[0, 0.85, 1.51]} fontSize={0.12} color="#0088ff">
                OPMC Homagama
            </Text>

            {/* Wheels */}
            {[-0.6, 0.6].map((x) => 
                [-1, 0, 1].map((z) => (
                    <mesh position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]} key={`wheel-${x}-${z}`}>
                        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                ))
            )}
            {/* Crane Base */}
            <mesh position={[0, 0.8, -0.8]}>
                <cylinderGeometry args={[0.4, 0.4, 0.4, 16]} />
                <meshStandardMaterial color="#f59e0b" />
            </mesh>
            {/* Crane Arm */}
            <group position={[0, 1.0, -0.8]} rotation={[-Math.PI / 4, 0, 0]}>
                <mesh position={[0, 1.5, 0]}>
                    <cylinderGeometry args={[0.15, 0.2, 3, 16]} />
                    <meshStandardMaterial color="#f59e0b" />
                </mesh>
                <mesh position={[0, 2.9, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                {/* Crane hook line */}
                <mesh position={[0, 1.5, 0.2]}>
                    <cylinderGeometry args={[0.01, 0.01, 2.8, 4]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            </group>
            
            {/* SLT Branding */}
            <Text position={[-0.61, 0.4, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.2} color="#0088ff">
                SLT-MOBITEL
            </Text>
            <Text position={[0.61, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.2} color="#0088ff">
                SLT-MOBITEL
            </Text>
        </group>
    );
};

// ==========================================
// 5. TELECOM TOWER
// ==========================================
const TelecomTower = () => {
    const lightMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const pointLightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        if (lightMatRef.current && pointLightRef.current) {
            const intensity = (Math.sin(state.clock.elapsedTime * 6) + 1) / 2; // Pulsing between 0 and 1
            lightMatRef.current.opacity = 0.2 + intensity * 0.8;
            lightMatRef.current.transparent = true;
            pointLightRef.current.intensity = intensity * 3 + 0.5;
        }
    });

    return (
        <group position={[-6, 0, -5]}>
            {/* Main Mast */}
            <mesh position={[0, 5, 0]}>
                <cylinderGeometry args={[0.2, 0.6, 10, 8]} />
                <meshStandardMaterial color="#64748b" />
            </mesh>
            {/* Rings / Platforms */}
            {[4, 6, 8].map((y) => (
                <group position={[0, y, 0]} key={`ring-${y}`}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[1, 0.05, 8, 24]} />
                        <meshStandardMaterial color="#cbd5e1" />
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[1, 1, 0.02, 16]} />
                        <meshStandardMaterial color="#334155" wireframe={true} />
                    </mesh>
                    {/* Antennas on rings */}
                    {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle, i) => (
                        <mesh position={[Math.cos(angle) * 1, 0.5, Math.sin(angle) * 1]} rotation={[0, -angle, 0]} key={`ant-${i}`}>
                            <boxGeometry args={[0.2, 1.2, 0.1]} />
                            <meshStandardMaterial color="#e2e8f0" />
                        </mesh>
                    ))}
                </group>
            ))}
            {/* 5G Antenna at the top */}
            <mesh position={[0, 10.5, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 1, 16]} />
                <meshStandardMaterial color="#f8fafc" />
            </mesh>
            {/* Red Light at top */}
            <mesh position={[0, 11.2, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial ref={lightMatRef} color="#ff0000" />
            </mesh>
            <pointLight ref={pointLightRef} position={[0, 11.2, 0]} color="#ff0000" intensity={3} distance={15} />
            {/* Tower Base Structure */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.8, 1.2, 1, 8]} />
                <meshStandardMaterial color="#475569" />
            </mesh>
        </group>
    );
};

// ==========================================
// 6. SATELLITE
// ==========================================
const Satellite = () => {
    const satRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (satRef.current) {
            // Orbit around the center high up
            satRef.current.position.x = Math.cos(state.clock.elapsedTime * 0.2) * 15;
            satRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.2) * 15;
            satRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group ref={satRef} position={[15, 18, -15]} rotation={[Math.PI / 6, 0, Math.PI / 6]}>
            {/* Central Body */}
            <mesh>
                <cylinderGeometry args={[0.6, 0.6, 2, 16]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <Text position={[0, 0, 0.61]} rotation={[0, 0, 0]} fontSize={0.2} color="#00ffff">
                SLT-MOBITEL
            </Text>
            {/* Antenna dish */}
            <mesh position={[0, 1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[0.5, 16, 16, 0, Math.PI]} />
                <meshStandardMaterial color="#e2e8f0" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
                <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0, 2.1, 0]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color="#ef4444" />
            </mesh>
            {/* Solar Panels */}
            <mesh position={[-2.5, 0, 0]}>
                <boxGeometry args={[4, 1.2, 0.05]} />
                <meshStandardMaterial color="#0055ff" />
                <gridHelper args={[4, 10, '#ffffff', '#ffffff']} rotation={[Math.PI/2, 0, 0]} position={[0,0,0.03]} />
            </mesh>
            <mesh position={[2.5, 0, 0]}>
                <boxGeometry args={[4, 1.2, 0.05]} />
                <meshStandardMaterial color="#0055ff" />
                <gridHelper args={[4, 10, '#ffffff', '#ffffff']} rotation={[Math.PI/2, 0, 0]} position={[0,0,0.03]} />
            </mesh>
            {/* Structure for panels */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.08, 0.08, 6, 8]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>

            {/* Blinking Light */}
            <mesh position={[0, -1.2, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color="#00ffff" />
            </mesh>
            <pointLight position={[0, -1.2, 0]} color="#00ffff" intensity={2} distance={8} />
        </group>
    );
};

// ==========================================
// 7. GROUND ANTENNA
// ==========================================
const GroundAntenna = () => {
    return (
        <group position={[0, 0, -5]} rotation={[0, -Math.PI / 4, 0]}>
            <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 2, 16]} />
                <meshStandardMaterial color="#475569" />
            </mesh>
            <group position={[0, 2, 0]} rotation={[Math.PI / 6, 0, 0]}>
                <mesh>
                    <sphereGeometry args={[2.5, 32, 16, 0, Math.PI]} />
                    <meshStandardMaterial color="#f1f5f9" side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, 1.5, -0.5]}>
                    <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                    <meshStandardMaterial color="#94a3b8" />
                </mesh>
                <mesh position={[0, 2.2, -0.5]}>
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshBasicMaterial color="#ef4444" />
                </mesh>
                <Text position={[0, -1.8, 1]} rotation={[Math.PI, Math.PI, Math.PI]} fontSize={0.4} color="#0088ff">
                    SLT-MOBITEL
                </Text>
            </group>
            <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[3, 0.4, 3]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
        </group>
    );
};

// ==========================================
// 8. GLOBAL FIBER CONNECTION
// ==========================================
const GlobalFiberConnection = () => {
    const curve = React.useMemo(() => new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 1, 0), // From Shop
        new THREE.Vector3(-3, 4, 2), // Control point
        new THREE.Vector3(-6, 2, 8)  // To Globe
    ), []);
    const tubeGeometry = React.useMemo(() => new THREE.TubeGeometry(curve, 64, 0.05, 8, false), [curve]);

    return (
        <group>
            {/* Globe */}
            <group position={[-6, 2, 8]}>
                <mesh>
                    <sphereGeometry args={[1.5, 32, 32]} />
                    <meshStandardMaterial color="#002244" wireframe />
                </mesh>
                <mesh>
                    <sphereGeometry args={[1.4, 16, 16]} />
                    <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
                </mesh>
                <Text position={[0, 2, 0]} fontSize={0.3} color="#00ffff" anchorY="bottom">
                    GLOBAL FIBER NODE
                </Text>
            </group>
            {/* Glowing Fiber Cable */}
            <mesh>
                <primitive object={tubeGeometry} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// ==========================================
// 9. SHOP DISPLAYS
// ==========================================
const ShopDisplays = () => {
    const routerLightRefs = useRef<THREE.MeshBasicMaterial[]>([]);

    useFrame((state) => {
        // Router lights blinking
        routerLightRefs.current.forEach((ref, index) => {
            if (ref) {
                // Different blinking patterns
                const time = state.clock.elapsedTime * 8;
                const offset = index * 0.5;
                ref.opacity = Math.sin(time + offset) > 0 ? 1 : 0.2;
                ref.transparent = true;
            }
        });
    });

    return (
        <group position={[0, 0, 3.5]}>
            {/* Display Table */}
            <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[3, 0.8, 1]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <mesh position={[0, 0.85, 0]}>
                <boxGeometry args={[3.2, 0.1, 1.2]} />
                <meshStandardMaterial color="#f8fafc" />
            </mesh>

            {/* Labels under the table with neon boxes */}
            <group position={[-1.1, 0.4, 0.51]}>
                <Text fontSize={0.15} color="#ef4444" anchorX="center" anchorY="middle">PEO TV</Text>
                <mesh position={[0, 0, -0.01]}>
                    <boxGeometry args={[0.7, 0.3, 0.01]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.1} />
                    <Edges color="#ef4444" />
                </mesh>
            </group>

            <group position={[-0.35, 0.4, 0.51]}>
                <Text fontSize={0.15} color="#eab308" anchorX="center" anchorY="middle">ADSL</Text>
                <mesh position={[0, 0, -0.01]}>
                    <boxGeometry args={[0.7, 0.3, 0.01]} />
                    <meshBasicMaterial color="#eab308" transparent opacity={0.1} />
                    <Edges color="#eab308" />
                </mesh>
            </group>

            <group position={[0.4, 0.4, 0.51]}>
                <Text fontSize={0.15} color="#22c55e" anchorX="center" anchorY="middle">FTTH</Text>
                <mesh position={[0, 0, -0.01]}>
                    <boxGeometry args={[0.7, 0.3, 0.01]} />
                    <meshBasicMaterial color="#22c55e" transparent opacity={0.1} />
                    <Edges color="#22c55e" />
                </mesh>
            </group>

            <group position={[1.15, 0.4, 0.51]}>
                <Text fontSize={0.15} color="#3b82f6" anchorX="center" anchorY="middle">DATA</Text>
                <mesh position={[0, 0, -0.01]}>
                    <boxGeometry args={[0.7, 0.3, 0.01]} />
                    <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
                    <Edges color="#3b82f6" />
                </mesh>
            </group>
            
            {/* Router */}
            <group position={[-1, 0.9, 0]}>
                <mesh>
                    <boxGeometry args={[0.4, 0.1, 0.3]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[-0.15, 0.15, -0.1]} rotation={[-Math.PI/6, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.2]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                <mesh position={[0.15, 0.15, -0.1]} rotation={[-Math.PI/6, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.2]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                <Text position={[0, 0.15, 0.1]} fontSize={0.08} color="#00ffff" rotation={[-Math.PI/4, 0, 0]}>ROUTER</Text>
                {/* Router blinking lights */}
                {Array.from({length: 4}).map((_, i) => (
                    <mesh position={[-0.1 + i * 0.066, 0, 0.15]} key={`router-light-${i}`}>
                        <sphereGeometry args={[0.015, 8, 8]} />
                        <meshBasicMaterial color={i === 0 ? "#ff0000" : "#00ff00"} ref={(el) => { if(el) routerLightRefs.current[i] = el; }} />
                    </mesh>
                ))}
            </group>
            
            {/* Telephone */}
            <group position={[0, 0.95, 0]}>
                <mesh rotation={[-Math.PI/8, 0, 0]}>
                    <boxGeometry args={[0.3, 0.05, 0.4]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                <mesh position={[0, 0.05, 0.05]} rotation={[-Math.PI/8, 0, 0]}>
                    <boxGeometry args={[0.08, 0.08, 0.35]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
                <Text position={[0, 0.15, 0.1]} fontSize={0.08} color="#00ffff" rotation={[-Math.PI/4, 0, 0]}>PHONE</Text>
            </group>

            {/* Switch */}
            <group position={[1, 0.95, 0]}>
                <mesh>
                    <boxGeometry args={[0.6, 0.15, 0.3]} />
                    <meshStandardMaterial color="#444" />
                </mesh>
                <mesh position={[0, 0, 0.16]}>
                    <planeGeometry args={[0.5, 0.1]} />
                    <meshBasicMaterial color="#222" />
                </mesh>
                {Array.from({length: 8}).map((_, i) => (
                    <mesh position={[-0.2 + i * 0.055, 0, 0.165]} key={i}>
                        <boxGeometry args={[0.03, 0.05, 0.01]} />
                        <meshBasicMaterial color="#00ff00" />
                    </mesh>
                ))}
                <Text position={[0, 0.15, 0]} fontSize={0.08} color="#00ffff" rotation={[-Math.PI/2, 0, 0]}>SWITCH</Text>
            </group>
        </group>
    );
};

// ==========================================
// CUSTOM MODEL (LIYA)
// ==========================================

class ModelErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

const ReceptionistModelLoad = () => {
    // Load the custom model
    const { scene } = useGLTF('/assets/liya.glb');
    
    return (
        <primitive 
            object={scene} 
            scale={[2.0, 2.0, 2.0]} 
            position={[0, 0, 0]} 
            rotation={[0, 0, 0]}
        />
    );
};

const ReceptionistModel = () => {
    return (
        <group position={[0, 0, 3.5]} rotation={[0, 0, 0]}>
            {/* Glowing Base Platform for the model */}
            <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.7, 0.7, 0.02, 32]} />
                <meshBasicMaterial color="#00ffff" />
            </mesh>
            <pointLight position={[0, 0.2, 0]} color="#00ffff" intensity={2} distance={3} />
            <Text position={[0, 0.15, 0.8]} fontSize={0.12} color="#00ffff" rotation={[-Math.PI / 2, 0, 0]}>
                LIYA VIRTUAL ASSISTANT
            </Text>

            <React.Suspense fallback={
                <Text position={[0, 1, 0]} fontSize={0.2} color="#00ffff">Loading 'liya'...</Text>
            }>
                <ModelErrorBoundary fallback={
                    <group>
                        <mesh position={[0, 1, 0]}>
                            <boxGeometry args={[0.5, 2, 0.5]} />
                            <meshBasicMaterial color="#ff0000" wireframe />
                        </mesh>
                        <Text position={[0, 2.2, 0]} fontSize={0.15} color="#ff0000">liya.glb Error</Text>
                    </group>
                }>
                    <ReceptionistModelLoad />
                </ModelErrorBoundary>
            </React.Suspense>
        </group>
    );
};

const Coin = ({ position, rotationYOffset = 0 }) => {
    const texture = useTexture(`${import.meta.env.BASE_URL}assets/coin.png`);
    const groupRef = useRef<any>(null);
    
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.02;
        }
    });

    return (
        <group position={position}>
            <group ref={groupRef}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
                    <meshStandardMaterial map={texture} metalness={0.7} roughness={0.2} />
                </mesh>
            </group>
            <Text position={[0, -0.5, 0]} fontSize={0.12} color="#00ffff" letterSpacing={0.1}>
                NEXUS COIN
            </Text>
        </group>
    );
};

// ==========================================
// 10. EXIT BOARD
// ==========================================
const ExitBoard = () => {
    const [hovered, setHovered] = useState(false);

    return (
        <group 
            position={[0, 1.5, 5]} 
            onClick={() => { window.parent.postMessage('open_teleshop', '*'); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[2.5, 1, 0.2]} />
                <meshStandardMaterial color={hovered ? "#0f172a" : "#1e293b"} />
            </mesh>
            <mesh position={[0, 0, 0.11]}>
                <boxGeometry args={[2.4, 0.9, 0.01]} />
                <meshBasicMaterial color={hovered ? "#00ffff" : "#3b82f6"} transparent opacity={0.2} />
                <Edges color={hovered ? "#00ffff" : "#3b82f6"} />
            </mesh>
            <Text position={[0, 0, 0.12]} fontSize={0.25} color={hovered ? "#00ffff" : "#ffffff"}>
                ENTER TELESHOP
            </Text>
            {hovered && <pointLight position={[0, 0, 0.5]} color="#00ffff" intensity={2} distance={3} />}
            
            {/* Left and Right Coins */}
            <Coin position={[-1.8, 0, 0]} />
            <Coin position={[1.8, 0, 0]} />
        </group>
    );
};

// ==========================================
// MAIN SCENE EXPORT
// ==========================================
interface SceneProps {
    bannerText?: string;
}

const SceneContent = ({ bannerText }: KioskProps) => {
    return (
        <>
            <color attach="background" args={['#000000']} />
            
            <OrbitControls 
                autoRotate 
                autoRotateSpeed={0.5} 
                maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from going under ground
                minDistance={5}
                maxDistance={40}
            />
            
            <Environment preset="city" />
            <ambientLight intensity={0.1} />
            
            {/* Global directional highlight */}
            <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />

            <NeonLamp />
            <Kiosk bannerText={bannerText} />
            <DioramaFloor />
            <TelecomVehicle />
            <TelecomTower />
            <Satellite />
            <GroundAntenna />
            <GlobalFiberConnection />
            <ShopDisplays />
            <ReceptionistModel />
            <ExitBoard />
        </>
    );
};

export default function Scene({ bannerText }: SceneProps) {
    return (
        <Canvas 
            camera={{ position: [10, 8, 12], fov: 45 }}
        >
            <React.Suspense fallback={null}>
                <SceneContent bannerText={bannerText} />
            </React.Suspense>
        </Canvas>
    );
}
