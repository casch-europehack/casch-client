import { useLoader } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CountryOverlays, LOCATIONS } from "./CountryOverlay";

const GLOBE_RADIUS = 2;

function Globe() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={useLoader(THREE.TextureLoader, "/earth-texture.jpg")}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.08, 64, 64]} />
        <meshStandardMaterial color="hsl(200, 60%, 50%)" transparent opacity={0.08} side={THREE.BackSide} />
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
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="hsl(200, 60%, 60%)" />
      <Globe />
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
      </div>
    </div>
  );
}
