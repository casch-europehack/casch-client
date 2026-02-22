import { useRef, useCallback, useState, useEffect } from "react";
import { Crosshair } from "lucide-react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CountryOverlays, LOCATIONS, latLngToVector3, CARBON_INTENSITY, intensityToColor } from "./CountryOverlay";
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

// Animates camera to face a location, then stops completely
function CameraFlyTo({ flyToTrigger, controlsRef }: { flyToTrigger: { location: string; id: number } | null; controlsRef: React.RefObject<any> }) {
  const { camera } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const animating = useRef(false);
  const lastTriggerId = useRef(0);

  useEffect(() => {
    if (!flyToTrigger || flyToTrigger.id === lastTriggerId.current) return;
    lastTriggerId.current = flyToTrigger.id;
    const loc = LOCATIONS.find((l) => l.value === flyToTrigger.location);
    if (!loc) return;

    const surfacePoint = latLngToVector3(loc.lat, loc.lng, GLOBE_RADIUS);
    const direction = surfacePoint.clone().normalize();
    targetPos.current = direction.multiplyScalar(CAMERA_DISTANCE);
    animating.current = true;
    // Disable orbit controls during animation
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [flyToTrigger, camera, controlsRef]);

  useFrame(() => {
    if (!animating.current || !targetPos.current) return;

    const current = camera.position.clone().normalize();
    const targetNorm = targetPos.current.clone().normalize();

    if (current.distanceTo(targetNorm) < 0.005) {
      camera.position.copy(targetPos.current);
      camera.lookAt(0, 0, 0);
      animating.current = false;
      targetPos.current = null;
      // Re-enable orbit controls and reset their state
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
        controlsRef.current.update();
      }
      return;
    }

    const newDir = current.lerp(targetNorm, 0.06);
    newDir.normalize().multiplyScalar(CAMERA_DISTANCE);
    camera.position.copy(newDir);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function Scene({
  value,
  onChange,
  disabled,
  flyToTrigger,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  flyToTrigger: { location: string; id: number } | null;
}) {
  const controlsRef = useRef<any>(null);

  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="hsl(200, 60%, 60%)" />
      <pointLight position={[3, 8, -3]} intensity={0.3} color="hsl(168, 50%, 50%)" />
      <StylizedGlobe />
      <CountryOverlays value={value} onChange={onChange} disabled={disabled} />
      <CameraFlyTo flyToTrigger={flyToTrigger} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
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
  const triggerIdRef = useRef(0);
  const [flyToTrigger, setFlyToTrigger] = useState<{ location: string; id: number } | null>(null);

  const handleSelect = useCallback(
    (newValue: string) => {
      triggerIdRef.current += 1;
      setFlyToTrigger({ location: newValue, id: triggerIdRef.current });
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="flex h-[480px] md:h-[480px]">
        {/* Location list panel - full width on mobile, fixed width on desktop */}
        <div className="w-full md:w-52 md:border-r border-border flex-shrink-0">
          <LocationList value={value} onChange={handleSelect} disabled={disabled} />
        </div>

        {/* Globe - hidden on mobile */}
        <div className="relative flex-1 hidden md:block">
          <Canvas
            camera={{ position: [0, 1.5, CAMERA_DISTANCE], fov: 38 }}
            style={{ background: "transparent" }}
            gl={{ antialias: true, alpha: true }}
          >
            <Scene value={value} onChange={handleSelect} disabled={disabled} flyToTrigger={flyToTrigger} />
          </Canvas>
          {/* Country name - upper left */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border text-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: intensityToColor(CARBON_INTENSITY[value] || 300).color }} />
            <span className="font-display font-medium text-foreground">{selectedLabel}</span>
          </div>
          {/* Recenter button - upper right */}
          <button
            onClick={() => handleSelect(value)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border text-xs font-display text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            title="Recenter on selected location"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Recenter
          </button>
          {disabled && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-muted/80 backdrop-blur-sm text-xs text-muted-foreground">
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
