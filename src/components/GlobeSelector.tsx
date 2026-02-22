import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CountryOverlays, LOCATIONS } from "./CountryOverlay";

const GLOBE_RADIUS = 2;

function AnimatedGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (wireRef.current) {
      wireRef.current.rotation.y = t * 0.02;
    }
  });

  return (
    <group>
      {/* Dark base sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="hsl(200, 30%, 8%)"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Wireframe grid overlay - slowly rotating */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[GLOBE_RADIUS + 0.005, 48, 32]} />
        <meshBasicMaterial
          color="hsl(200, 60%, 35%)"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Subtle latitude lines */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.003, 6, 64]} />
        <meshBasicMaterial
          color="hsl(168, 50%, 40%)"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Atmospheric glow - inner */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[GLOBE_RADIUS + 0.06, 64, 64]} />
        <meshStandardMaterial
          color="hsl(200, 60%, 50%)"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Atmospheric glow - outer */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.15, 64, 64]} />
        <meshStandardMaterial
          color="hsl(200, 70%, 55%)"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function Scene({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="hsl(200, 60%, 60%)" />
      <pointLight position={[3, 8, -3]} intensity={0.2} color="hsl(168, 50%, 50%)" />
      <AnimatedGlobe />
      <CountryOverlays value={value} onChange={onChange} disabled={disabled} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.4}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
      />
    </>
  );
}

interface GlobeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function GlobeSelector({ value, onChange, disabled }: GlobeSelectorProps) {
  const selectedLabel = LOCATIONS.find((l) => l.value === value)?.label ?? value;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="relative h-[360px] w-full">
        <Canvas
          camera={{ position: [0, 1.5, 5.5], fov: 40 }}
          style={{ background: "transparent" }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene value={value} onChange={onChange} disabled={disabled} />
        </Canvas>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border text-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-display font-medium text-foreground">{selectedLabel}</span>
          </div>
          {disabled && (
            <div className="px-3 py-1.5 rounded-full bg-muted/80 backdrop-blur-sm text-xs text-muted-foreground">
              Loading…
            </div>
          )}
        </div>
        {/* CO2 intensity legend */}
        <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card/80 backdrop-blur-sm border border-border text-[10px] font-display">
          <span className="text-muted-foreground">CO₂ Intensity:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "hsl(120, 65%, 45%)" }} />
            Low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "hsl(60, 70%, 45%)" }} />
            Med
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "hsl(0, 80%, 45%)" }} />
            High
          </span>
        </div>
      </div>
    </div>
  );
}
