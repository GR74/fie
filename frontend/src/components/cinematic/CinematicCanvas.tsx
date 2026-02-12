"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useTelemetry } from "@/components/cinematic/Telemetry";

// Football shape (prolate spheroid)
function Football({ position, scale = 1, intensity = 1 }: { position: [number, number, number]; scale?: number; intensity?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.x = t * 0.3;
      ref.current.rotation.z = Math.sin(t * 0.5) * 0.2;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[0.35, 32, 16]} />
      <meshStandardMaterial 
        color="#5C4033" 
        metalness={0.3} 
        roughness={0.6}
        emissive="#3a2820"
        emissiveIntensity={0.15 * intensity}
      />
    </mesh>
  );
}

// Stadium bowl/ring structure
function StadiumRing({ radius, height, y, color, intensity }: { radius: number; height: number; y: number; color: string; intensity: number }) {
  return (
    <mesh position={[0, y, -4]} rotation={[0.15, 0, 0]}>
      <torusGeometry args={[radius, height, 6, 48, Math.PI * 1.3]} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.4} 
        roughness={0.5}
        emissive={color}
        emissiveIntensity={0.08 * intensity}
      />
    </mesh>
  );
}

// Stadium light tower
function LightTower({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 3, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Light bank */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.15, 0.2]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={1.2 * intensity}
        />
      </mesh>
      <pointLight position={[0, -0.2, 0.3]} intensity={0.8 * intensity} color="#fff8e0" distance={12} />
    </group>
  );
}

// Concession stand item
function ConcessionItem({ 
  position, 
  type 
}: { 
  position: [number, number, number]; 
  type: "cup" | "hotdog" | "popcorn" | "nachos";
}) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.y = Math.sin(t * 0.5 + position[0]) * 0.3;
      ref.current.position.y = position[1] + Math.sin(t * 0.8 + position[0] * 2) * 0.05;
    }
  });

  return (
    <group ref={ref} position={position}>
      {type === "cup" && (
        <>
          {/* Cup body */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.22, 16]} />
            <meshStandardMaterial color="#bb0000" metalness={0.1} roughness={0.4} />
          </mesh>
          {/* Lid */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.02, 16]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.5} />
          </mesh>
          {/* Straw */}
          <mesh position={[0.02, 0.18, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
            <meshStandardMaterial color="#cc0000" />
          </mesh>
        </>
      )}
      {type === "hotdog" && (
        <>
          {/* Bun */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.04, 0.14, 8, 16]} />
            <meshStandardMaterial color="#d4a055" roughness={0.7} />
          </mesh>
          {/* Hotdog */}
          <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.025, 0.16, 8, 16]} />
            <meshStandardMaterial color="#c45c3e" roughness={0.5} />
          </mesh>
        </>
      )}
      {type === "popcorn" && (
        <>
          {/* Container */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.07, 0.18, 16]} />
            <meshStandardMaterial color="#cc0000" metalness={0.1} roughness={0.4} />
          </mesh>
          {/* Popcorn pile */}
          {[...Array(8)].map((_, i) => (
            <mesh 
              key={i} 
              position={[
                Math.sin(i * 0.8) * 0.04,
                0.12 + Math.random() * 0.03,
                Math.cos(i * 0.8) * 0.04
              ]}
            >
              <sphereGeometry args={[0.025 + Math.random() * 0.015, 6, 6]} />
              <meshStandardMaterial color="#fff8dc" roughness={0.9} />
            </mesh>
          ))}
        </>
      )}
      {type === "nachos" && (
        <>
          {/* Tray */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.14, 0.03, 0.1]} />
            <meshStandardMaterial color="#8B4513" roughness={0.7} />
          </mesh>
          {/* Chips */}
          {[...Array(5)].map((_, i) => (
            <mesh 
              key={i} 
              position={[
                (Math.random() - 0.5) * 0.08,
                0.03 + i * 0.01,
                (Math.random() - 0.5) * 0.05
              ]}
              rotation={[Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3]}
            >
              <coneGeometry args={[0.03, 0.01, 3]} />
              <meshStandardMaterial color="#f4d03f" roughness={0.8} />
            </mesh>
          ))}
          {/* Cheese drizzle */}
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#ffa500" roughness={0.4} emissive="#ffa500" emissiveIntensity={0.1} />
          </mesh>
        </>
      )}
    </group>
  );
}

// Floating yard line marker
function YardMarker({ position, number }: { position: [number, number, number]; number: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.y = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <boxGeometry args={[0.4, 0.08, 0.02]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// Player silhouette
function PlayerSilhouette({ position, action, intensity }: { position: [number, number, number]; action: "running" | "throwing" | "catching"; intensity: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      // Running motion
      if (action === "running") {
        ref.current.position.x = position[0] + Math.sin(t * 2) * 0.1;
        ref.current.rotation.z = Math.sin(t * 4) * 0.1;
      }
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.06, 0.15, 4, 8]} />
        <meshStandardMaterial 
          color="#bb0000" 
          metalness={0.3} 
          roughness={0.5}
          emissive="#bb0000"
          emissiveIntensity={0.15 * intensity}
        />
      </mesh>
      {/* Helmet */}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial 
          color="#cccccc" 
          metalness={0.6} 
          roughness={0.3}
        />
      </mesh>
      {/* Jersey number stripe */}
      <mesh position={[0, 0.02, 0.065]}>
        <boxGeometry args={[0.04, 0.08, 0.005]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Particles/confetti
function Confetti({ count = 50, intensity = 1 }: { count?: number; intensity?: number }) {
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = Math.random() * 6 - 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return arr;
  }, [count]);

  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const scarlet = new THREE.Color("#bb0000");
    const gray = new THREE.Color("#8a8a8a");
    const white = new THREE.Color("#ffffff");
    const palette = [scarlet, gray, white];
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      const t = state.clock.getElapsedTime();
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= 0.008 * intensity;
        positions[i * 3] += Math.sin(t + i) * 0.002;
        if (positions[i * 3 + 1] < -2) {
          positions[i * 3 + 1] = 5;
        }
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} vertexColors transparent opacity={0.7 * intensity} />
    </points>
  );
}

// Main field element
function FootballField({ intensity }: { intensity: number }) {
  return (
    <group position={[0, -1.1, -3]} rotation={[-Math.PI / 2 + 0.1, 0, 0]}>
      {/* Field surface */}
      <mesh>
        <planeGeometry args={[5, 2.5]} />
        <meshStandardMaterial 
          color="#1a5c1a" 
          metalness={0.1} 
          roughness={0.8}
          emissive="#0a3a0a"
          emissiveIntensity={0.1 * intensity}
        />
      </mesh>
      {/* Yard lines */}
      {[...Array(11)].map((_, i) => (
        <mesh key={i} position={[(i - 5) * 0.45, 0, 0.01]}>
          <planeGeometry args={[0.02, 2.3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {/* End zones */}
      <mesh position={[-2.4, 0, 0.005]}>
        <planeGeometry args={[0.35, 2.3]} />
        <meshStandardMaterial color="#bb0000" emissive="#bb0000" emissiveIntensity={0.15 * intensity} />
      </mesh>
      <mesh position={[2.4, 0, 0.005]}>
        <planeGeometry args={[0.35, 2.3]} />
        <meshStandardMaterial color="#666666" emissive="#444444" emissiveIntensity={0.1 * intensity} />
      </mesh>
    </group>
  );
}

function Scene({ intensity = 1, fx = true }: { intensity?: number; fx?: boolean }) {
  const rig = useRef<THREE.Group>(null);
  const cam = useRef<THREE.PerspectiveCamera>(null);

  const lights = useMemo(() => {
    return [
      { color: new THREE.Color("#ffffff"), pos: new THREE.Vector3(6, 8, 7), i: 1.5 * intensity },
      { color: new THREE.Color("#bb0000"), pos: new THREE.Vector3(-6, 4, 4), i: 1.8 * intensity },
      { color: new THREE.Color("#8a8f98"), pos: new THREE.Vector3(0, 12, -6), i: 1.1 * intensity },
      { color: new THREE.Color("#fff8e0"), pos: new THREE.Vector3(4, 10, -4), i: 0.8 * intensity },
    ];
  }, [intensity]);

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime();
    const px = state.pointer.x;
    const py = state.pointer.y;

    if (rig.current) {
      rig.current.rotation.y = THREE.MathUtils.lerp(rig.current.rotation.y, px * 0.15, 1 - Math.pow(0.001, dt));
      rig.current.rotation.x = THREE.MathUtils.lerp(rig.current.rotation.x, -py * 0.1, 1 - Math.pow(0.001, dt));
      rig.current.position.x = THREE.MathUtils.lerp(rig.current.position.x, px * 0.3, 1 - Math.pow(0.001, dt));
      rig.current.position.y = THREE.MathUtils.lerp(rig.current.position.y, py * 0.18, 1 - Math.pow(0.001, dt));
    }

    if (cam.current) {
      cam.current.fov = THREE.MathUtils.lerp(cam.current.fov, 44 + Math.sin(t * 0.35) * 0.5, 1 - Math.pow(0.01, dt));
      cam.current.updateProjectionMatrix();
    }
  });

  return (
    <group ref={rig}>
      <PerspectiveCamera ref={cam} makeDefault position={[0, 1.2, 7]} fov={44} />

      {/* Stadium-ish lighting */}
      {lights.map((l, idx) => (
        <spotLight
          key={idx}
          color={l.color}
          position={[l.pos.x, l.pos.y, l.pos.z]}
          intensity={l.i}
          angle={0.5}
          penumbra={0.7}
          distance={30}
          castShadow={false}
        />
      ))}
      <ambientLight intensity={0.2 * intensity} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#030305" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Stadium bowl rings */}
      <StadiumRing radius={6} height={0.4} y={1.5} color="#1a1a1a" intensity={intensity} />
      <StadiumRing radius={7} height={0.5} y={2.2} color="#252525" intensity={intensity} />
      <StadiumRing radius={8} height={0.6} y={3} color="#333333" intensity={intensity} />

      {/* Stadium light towers */}
      <LightTower position={[-4, 4, -3]} intensity={intensity} />
      <LightTower position={[4, 4, -3]} intensity={intensity} />
      <LightTower position={[-5.5, 3.5, 0]} intensity={intensity * 0.7} />
      <LightTower position={[5.5, 3.5, 0]} intensity={intensity * 0.7} />

      {/* Football field */}
      <FootballField intensity={intensity} />

      {/* Floating football - hero element */}
      <Float speed={1.3} rotationIntensity={0.7} floatIntensity={0.6} floatingRange={[-0.1, 0.3]}>
        <Football position={[0, 0.8, 1]} scale={2.2} intensity={intensity} />
      </Float>

      {/* Player silhouettes */}
      <Float speed={0.8} floatIntensity={0.3}>
        <PlayerSilhouette position={[-1.5, -0.4, 0]} action="running" intensity={intensity} />
      </Float>
      <Float speed={0.9} floatIntensity={0.25}>
        <PlayerSilhouette position={[1.8, -0.5, -0.5]} action="throwing" intensity={intensity} />
      </Float>
      <Float speed={0.7} floatIntensity={0.35}>
        <PlayerSilhouette position={[0.3, -0.35, 1.5]} action="catching" intensity={intensity} />
      </Float>

      {/* Concession items floating around */}
      <Float speed={1.1} floatIntensity={0.4} floatingRange={[-0.1, 0.2]}>
        <ConcessionItem position={[-2.8, 0.5, 1.5]} type="cup" />
      </Float>
      <Float speed={0.9} floatIntensity={0.35} floatingRange={[-0.15, 0.15]}>
        <ConcessionItem position={[2.6, 0.8, 1]} type="popcorn" />
      </Float>
      <Float speed={1.2} floatIntensity={0.45} floatingRange={[-0.1, 0.25]}>
        <ConcessionItem position={[-3.2, 1.2, -0.5]} type="hotdog" />
      </Float>
      <Float speed={0.85} floatIntensity={0.3} floatingRange={[-0.1, 0.2]}>
        <ConcessionItem position={[3, 0.3, 0.5]} type="nachos" />
      </Float>

      {/* Ohio State "O" scarlet accent ring */}
      <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh position={[0, 2.5, -2]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[0.8, 0.12, 16, 48]} />
          <meshStandardMaterial 
            color="#bb0000" 
            metalness={0.7} 
            roughness={0.2}
            emissive="#bb0000"
            emissiveIntensity={0.3 * intensity}
          />
        </mesh>
      </Float>

      {/* Confetti/particles */}
      <Confetti count={60} intensity={intensity} />

      {/* Fog for cinematic depth */}
      <fog attach="fog" args={["#020204", 7, 20]} />

      <Environment preset="city" />

      {fx ? (
        <EffectComposer multisampling={0}>
          <Bloom intensity={1.0 * intensity} luminanceThreshold={0.12} luminanceSmoothing={0.2} />
          <DepthOfField focusDistance={0.015} focalLength={0.04} bokehScale={2.8} height={480} />
          <Vignette eskil={false} offset={0.12} darkness={0.6} />
        </EffectComposer>
      ) : null}
    </group>
  );
}

export function CinematicCanvas() {
  const { telemetry, quality } = useTelemetry();

  // Drive intensity from live metrics
  const intensity = useMemo(() => {
    const win = THREE.MathUtils.clamp(telemetry.winDeltaPp / 3.0, -1, 1); // +/-3pp maps to +/-1
    const db = THREE.MathUtils.clamp((telemetry.decibels - 90) / 18.0, 0, 1);
    const ops = THREE.MathUtils.clamp((telemetry.opsUtil - 0.85) / 0.35, 0, 1);
    // More win + more dB = more punch; high ops pressure adds a warning bite.
    return 0.9 + 0.6 * db + 0.35 * Math.max(0, win) + 0.2 * ops;
  }, [telemetry.winDeltaPp, telemetry.decibels, telemetry.opsUtil]);

  // 3D canvas disabled - using clean gradient background instead
  return null;
}


