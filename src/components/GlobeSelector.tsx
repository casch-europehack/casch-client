import { useRef, useCallback, useState, useEffect } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CountryOverlays, LOCATIONS, latLngToVector3 } from "./CountryOverlay";
import { LocationList } from "./LocationList";

const GLOBE_RADIUS = 2;
const CAMERA_DISTANCE = 6.2;

function StylizedGlobe() {
  const texture = useLoader(THREE.TextureLoader, "/earth-texture.jpg");

  return (
    <group>
      {/* Stylized Earth sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.6} metalness={0.0} />
      </mesh>

      {/* Atmospheric glow - inner */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.06, 64, 64]} />
        <meshStandardMaterial color="hsl(200, 70%, 60%)" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>

      {/* Atmospheric glow - outer */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.18, 64, 64]} />
        <meshStandardMaterial color="hsl(200, 80%, 65%)" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// Animates camera to face a location on the globe
function CameraAnimator({ targetLocation }: { targetLocation: string | null }) {
  const { camera } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const animating = useRef(false);

  useEffect(() => {
    if (!targetLocation) return;
    const loc = LOCATIONS.find((l) => l.value === targetLocation);
    if (!loc) return;

    // Calculate camera position facing this location
    const surfacePoint = latLngToVector3(loc.lat, loc.lng, GLOBE_RADIUS);
    const direction = surfacePoint.clone().normalize();
    targetPos.current = direction.multiplyScalar(CAMERA_DISTANCE);
    animating.current = true;
  }, [targetLocation, camera]);

  useFrame(() => {
    if (!animating.current || !targetPos.current) return;

    const current = camera.position.clone();
    const target = targetPos.current;

    // Spherical lerp - keep distance constant
    current.normalize();
    const targetNorm = target.clone().normalize();

    const newDir = current.lerp(targetNorm, 0.04);
    newDir.normalize().multiplyScalar(CAMERA_DISTANCE);

    camera.position.copy(newDir);
    camera.lookAt(0, 0, 0);

    if (current.distanceTo(targetNorm) < 0.005) {
      animating.current = false;
    }
  });

  return null;
}

function Scene({
  value,
  onChange,
  disabled,
  animateToLocation,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  animateToLocation: string | null;
}) {
  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="hsl(200, 60%, 60%)" />
      <pointLight position={[3, 8, -3]} intensity={0.3} color="hsl(168, 50%, 50%)" />
      <StylizedGlobe />
      <CountryOverlays value={value} onChange={onChange} disabled={disabled} />
      <CameraAnimator targetLocation={animateToLocation} />
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
  const [animateTarget, setAnimateTarget] = useState<string | null>(null);

  const handleSelect = useCallback(
    (newValue: string) => {
      setAnimateTarget(newValue);
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="flex h-[480px]">
        {/* Location list panel */}
        <div className="w-52 border-r border-border flex-shrink-0">
          <LocationList value={value} onChange={handleSelect} disabled={disabled} />
        </div>

        {/* Globe */}
        <div className="relative flex-1">
          <Canvas
            camera={{ position: [0, 1.5, CAMERA_DISTANCE], fov: 38 }}
            style={{ background: "transparent" }}
            gl={{ antialias: true, alpha: true }}
          >
            <Scene value={value} onChange={handleSelect} disabled={disabled} animateToLocation={animateTarget} />
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
    </div>
  );
}
