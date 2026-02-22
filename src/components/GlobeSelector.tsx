import { useRef, useCallback, useState, useEffect } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Crosshair } from "lucide-react";
import { CountryOverlays, LOCATIONS, latLngToVector3, CARBON_INTENSITY, intensityToColor } from "./CountryOverlay";
import { LocationList } from "./LocationList";

const GLOBE_RADIUS = 2;
const CAMERA_DISTANCE = 6.2;

function StylizedGlobe() {
  const texture = useLoader(THREE.TextureLoader, "/earth-texture.jpg");

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.6} metalness={0.0} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.06, 64, 64]} />
        <meshStandardMaterial color="hsl(200, 70%, 60%)" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.18, 64, 64]} />
        <meshStandardMaterial color="hsl(200, 80%, 65%)" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// Animates camera to face a location, only when triggered
function CameraFlyTo({ targetValue, triggerCount }: { targetValue: string; triggerCount: number }) {
  const { camera } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const animating = useRef(false);
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (triggerCount === 0 || triggerCount === lastTrigger.current) return;
    lastTrigger.current = triggerCount;

    const loc = LOCATIONS.find((l) => l.value === targetValue);
    if (!loc) return;

    const surfacePoint = latLngToVector3(loc.lat, loc.lng, GLOBE_RADIUS);
    const direction = surfacePoint.clone().normalize();
    targetPos.current = direction.multiplyScalar(CAMERA_DISTANCE);
    animating.current = true;
  }, [triggerCount, targetValue, camera]);

  useFrame(() => {
    if (!animating.current || !targetPos.current) return;

    const current = camera.position.clone();
    const target = targetPos.current.clone();

    camera.position.lerp(target, 0.08);
    camera.lookAt(0, 0, 0);

    if (camera.position.distanceTo(target) < 0.01) {
      camera.position.copy(target);
      camera.lookAt(0, 0, 0);
      animating.current = false;
      targetPos.current = null;
    }
  });

  return null;
}

function Scene({
  value,
  onChange,
  disabled,
  flyToValue,
  flyToTrigger,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  flyToValue: string;
  flyToTrigger: number;
}) {
  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="hsl(200, 60%, 60%)" />
      <pointLight position={[3, 8, -3]} intensity={0.3} color="hsl(168, 50%, 50%)" />
      <StylizedGlobe />
      <CountryOverlays value={value} onChange={onChange} disabled={disabled} />
      <CameraFlyTo targetValue={flyToValue} triggerCount={flyToTrigger} />
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
  const [flyToTrigger, setFlyToTrigger] = useState(0);
  const [flyToValue, setFlyToValue] = useState(value);

  // Get the intensity color for the selected location
  const selectedIntensity = CARBON_INTENSITY[value] || 300;
  const selectedColor = intensityToColor(selectedIntensity);

  const handleSelect = useCallback(
    (newValue: string) => {
      setFlyToValue(newValue);
      setFlyToTrigger((t) => t + 1);
      onChange(newValue);
    },
    [onChange],
  );

  const handleRecenter = useCallback(() => {
    setFlyToValue(value);
    setFlyToTrigger((t) => t + 1);
  }, [value]);

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
            <Scene
              value={value}
              onChange={handleSelect}
              disabled={disabled}
              flyToValue={flyToValue}
              flyToTrigger={flyToTrigger}
            />
          </Canvas>

          {/* Recenter button - upper left */}
          <button
            onClick={handleRecenter}
            className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-card/80 backdrop-blur-sm border border-border text-xs font-display text-foreground hover:bg-card transition-colors"
            title="Recenter on selected location"
          >
            <Crosshair className="w-3.5 h-3.5 text-primary" />
            Recenter
          </button>

          {/* Selected location indicator - bottom left */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border text-sm">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: selectedColor.color }}
              />
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
