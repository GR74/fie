"use client";

import { Suspense, useState, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  Environment, 
  Text, 
  Html,
  PerspectiveCamera 
} from "@react-three/drei";
import * as THREE from "three";

interface SectionData {
  id: string;
  name: string;
  type: "student" | "general" | "premium" | "club";
  capacity: number;
  fill: number;
  angle: number; // degrees around the horseshoe
  tier: number; // 0 = lower, 1 = upper
}

// Ohio Stadium-inspired section layout
const SECTIONS: SectionData[] = [
  // Lower bowl - South (student sections)
  { id: "a", name: "Section A", type: "student", capacity: 2500, fill: 0.98, angle: 0, tier: 0 },
  { id: "b", name: "Section B", type: "student", capacity: 2500, fill: 0.97, angle: 20, tier: 0 },
  { id: "c", name: "Section C", type: "student", capacity: 2500, fill: 0.95, angle: 40, tier: 0 },
  // Lower bowl - West
  { id: "d", name: "Section D", type: "general", capacity: 3000, fill: 0.92, angle: 60, tier: 0 },
  { id: "e", name: "Section E", type: "general", capacity: 3000, fill: 0.90, angle: 80, tier: 0 },
  { id: "f", name: "Section F", type: "premium", capacity: 2000, fill: 0.88, angle: 100, tier: 0 },
  // Lower bowl - North
  { id: "g", name: "Section G", type: "club", capacity: 1500, fill: 0.95, angle: 120, tier: 0 },
  { id: "h", name: "Section H", type: "club", capacity: 1500, fill: 0.94, angle: 140, tier: 0 },
  // Lower bowl - East
  { id: "i", name: "Section I", type: "general", capacity: 3000, fill: 0.89, angle: 160, tier: 0 },
  { id: "j", name: "Section J", type: "general", capacity: 3000, fill: 0.87, angle: 180, tier: 0 },
  { id: "k", name: "Section K", type: "general", capacity: 3000, fill: 0.85, angle: 200, tier: 0 },
  // Lower bowl - back to south
  { id: "l", name: "Section L", type: "student", capacity: 2500, fill: 0.96, angle: 220, tier: 0 },
  { id: "m", name: "Section M", type: "student", capacity: 2500, fill: 0.94, angle: 240, tier: 0 },
  // Upper deck
  { id: "ua", name: "Upper A", type: "general", capacity: 4000, fill: 0.85, angle: 0, tier: 1 },
  { id: "ub", name: "Upper B", type: "general", capacity: 4000, fill: 0.82, angle: 40, tier: 1 },
  { id: "uc", name: "Upper C", type: "general", capacity: 4000, fill: 0.80, angle: 80, tier: 1 },
  { id: "ud", name: "Upper D", type: "general", capacity: 4000, fill: 0.78, angle: 120, tier: 1 },
  { id: "ue", name: "Upper E", type: "general", capacity: 4000, fill: 0.82, angle: 160, tier: 1 },
  { id: "uf", name: "Upper F", type: "general", capacity: 4000, fill: 0.84, angle: 200, tier: 1 },
];

interface SectionMeshProps {
  section: SectionData;
  fillOverride?: number;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick?: (section: SectionData) => void;
}

function SectionMesh({ section, fillOverride, isHovered, onHover, onClick }: SectionMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const fill = fillOverride ?? section.fill;

  // Colors based on section type
  const baseColor = useMemo(() => {
    switch (section.type) {
      case "student": return new THREE.Color("#bb0000");
      case "premium": return new THREE.Color("#fbbf24");
      case "club": return new THREE.Color("#22c55e");
      default: return new THREE.Color("#6b7280");
    }
  }, [section.type]);

  // Calculate position on horseshoe
  const radius = section.tier === 0 ? 8 : 10;
  const height = section.tier === 0 ? 1 : 3;
  const angleRad = (section.angle * Math.PI) / 180;
  const x = Math.sin(angleRad) * radius;
  const z = Math.cos(angleRad) * radius;

  // Animate hover
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isHovered ? 1.1 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  // Color intensity based on fill
  const color = baseColor.clone();
  color.multiplyScalar(0.3 + fill * 0.7);

  return (
    <mesh
      ref={meshRef}
      position={[x, height, z]}
      rotation={[0, -angleRad, 0]}
      onPointerOver={() => onHover(section.id)}
      onPointerOut={() => onHover(null)}
      onClick={() => onClick?.(section)}
    >
      <boxGeometry args={[2, 2, 0.8]} />
      <meshStandardMaterial
        color={color}
        emissive={isHovered ? baseColor : new THREE.Color(0)}
        emissiveIntensity={isHovered ? 0.3 : 0}
        transparent
        opacity={0.8 + fill * 0.2}
      />
    </mesh>
  );
}

function Field() {
  return (
    <group>
      {/* Field surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[6, 10]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>
      {/* Field lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[5.5, 9.5]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} wireframe />
      </mesh>
      {/* Center logo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#bb0000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function StadiumLights() {
  return (
    <>
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <pointLight
            key={i}
            position={[Math.sin(rad) * 12, 10, Math.cos(rad) * 12]}
            intensity={100}
            color="#fff8e7"
          />
        );
      })}
    </>
  );
}

interface Stadium3DProps {
  attendance: number;
  capacity: number;
  studentRatio: number;
  onSectionClick?: (section: SectionData) => void;
  className?: string;
}

export function Stadium3D({
  attendance,
  capacity,
  studentRatio,
  onSectionClick,
  className = "",
}: Stadium3DProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionData | null>(null);

  // Calculate fill based on overall attendance
  const overallFill = attendance / capacity;

  // Adjust section fills based on student ratio and overall attendance
  const adjustedSections = useMemo(() => {
    return SECTIONS.map((s) => {
      let adjustedFill = s.fill * overallFill;
      
      // Students fill student sections more
      if (s.type === "student") {
        adjustedFill = Math.min(1, adjustedFill * (1 + studentRatio));
      }
      
      return {
        ...s,
        fill: Math.min(1, adjustedFill),
      };
    });
  }, [overallFill, studentRatio]);

  const hoveredData = adjustedSections.find((s) => s.id === hoveredSection);

  return (
    <div className={`relative ${className}`}>
      <Canvas style={{ height: 400 }}>
        <PerspectiveCamera makeDefault position={[0, 15, 20]} fov={45} />
        <OrbitControls
          enablePan={false}
          minDistance={15}
          maxDistance={35}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.5}
        />

        <ambientLight intensity={0.3} />
        <StadiumLights />

        <Suspense fallback={null}>
          <Field />
          
          {adjustedSections.map((section) => (
            <SectionMesh
              key={section.id}
              section={section}
              isHovered={hoveredSection === section.id}
              onHover={setHoveredSection}
              onClick={(s) => {
                setSelectedSection(s);
                onSectionClick?.(s);
              }}
            />
          ))}

          <Environment preset="night" />
        </Suspense>
      </Canvas>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="absolute top-4 left-4 px-4 py-3 rounded-xl text-sm pointer-events-none"
          style={{
            background: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="font-bold text-white">{hoveredData.name}</div>
          <div className="text-white/60 text-xs mt-1 space-y-0.5">
            <div>Type: <span className="text-white/90 capitalize">{hoveredData.type}</span></div>
            <div>Capacity: <span className="text-white/90">{hoveredData.capacity.toLocaleString()}</span></div>
            <div>Fill: <span className="text-white/90">{(hoveredData.fill * 100).toFixed(0)}%</span></div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 px-3 py-2 rounded-lg text-[10px]" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "#bb0000" }} />
            Student
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "#6b7280" }} />
            General
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "#fbbf24" }} />
            Premium
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "#22c55e" }} />
            Club
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-[10px] text-white/40">
        Drag to rotate • Scroll to zoom • Click section for details
      </div>
    </div>
  );
}

