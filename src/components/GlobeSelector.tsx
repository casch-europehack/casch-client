import { useRef, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

interface LocationPoint {
  value: string;
  label: string;
  lat: number;
  lng: number;
}

const LOCATION_POINTS: LocationPoint[] = [
  { value: "IE", label: "Dublin, Ireland", lat: 53.35, lng: -6.26 },
  { value: "PL", label: "Poland", lat: 52.23, lng: 21.01 },
  { value: "DE", label: "Germany", lat: 51.17, lng: 10.45 },
  { value: "FR", label: "France", lat: 46.6, lng: 1.89 },
  { value: "SE", label: "Sweden", lat: 60.13, lng: 18.64 },
  { value: "US-CAL-CISO", label: "California, USA", lat: 36.78, lng: -119.42 },
  { value: "US-NY-NYIS", label: "New York, USA", lat: 40.71, lng: -74.01 },
  { value: "GB", label: "United Kingdom", lat: 55.38, lng: -3.44 },
  { value: "NO-NO1", label: "Norway", lat: 60.47, lng: 8.47 },
];

const GLOBE_RADIUS = 2;

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function generateGlobeLines(radius: number): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  const segments = 96;

  // Latitude lines every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const lng = (i / segments) * 360 - 180;
      points.push(latLngToVector3(lat, lng, radius));
    }
    geometries.push(new THREE.BufferGeometry().setFromPoints(points));
  }

  // Longitude lines every 30 degrees
  for (let lng = -180; lng < 180; lng += 30) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const lat = (i / segments) * 180 - 90;
      points.push(latLngToVector3(lat, lng, radius));
    }
    geometries.push(new THREE.BufferGeometry().setFromPoints(points));
  }

  return geometries;
}

function Globe() {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
    }
  });

  const gridLines = useMemo(() => generateGlobeLines(GLOBE_RADIUS), []);

  return (
    <group ref={ref}>
      {/* Solid sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS - 0.01, 64, 64]} />
        <meshStandardMaterial
          color="hsl(170, 25%, 8%)"
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Grid lines */}
      {gridLines.map((geo, i) => {
        const mat = new THREE.LineBasicMaterial({ color: "hsl(168, 40%, 28%)", transparent: true, opacity: 0.3 });
        const lineObj = new THREE.Line(geo, mat);
        return <primitive key={i} object={lineObj} />;
      })}

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.08, 64, 64]} />
        <meshStandardMaterial
          color="hsl(168, 60%, 45%)"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

interface MarkerProps {
  location: LocationPoint;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

function LocationMarker({ location, isSelected, isHovered, onSelect, onHover }: MarkerProps) {
  const position = useMemo(
    () => latLngToVector3(location.lat, location.lng, GLOBE_RADIUS + 0.02),
    [location]
  );

  const pulseRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (pulseRef.current && isSelected) {
      pulseRef.current.scale.x = 1 + Math.sin(Date.now() * 0.004) * 0.3;
      pulseRef.current.scale.y = pulseRef.current.scale.x;
      pulseRef.current.scale.z = pulseRef.current.scale.x;
    }
  });

  const size = isSelected ? 0.08 : isHovered ? 0.065 : 0.05;

  return (
    <group position={position}>
      {/* Pulse ring for selected */}
      {isSelected && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="hsl(168, 60%, 45%)"
            transparent
            opacity={0.25}
          />
        </mesh>
      )}
      {/* Marker dot */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? "hsl(168, 60%, 50%)" : isHovered ? "hsl(38, 80%, 55%)" : "hsl(168, 55%, 40%)"}
          emissive={isSelected ? "hsl(168, 60%, 30%)" : isHovered ? "hsl(38, 70%, 35%)" : "hsl(168, 55%, 15%)"}
          emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.6 : 0.3}
        />
      </mesh>
      {/* Label */}
      {(isHovered || isSelected) && (
        <Html
          position={[0, 0.18, 0]}
          center
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          <div
            className="px-2.5 py-1 rounded-md text-xs font-display font-medium shadow-elevated"
            style={{
              background: "hsl(170, 20%, 10%)",
              color: "hsl(160, 10%, 93%)",
              border: "1px solid hsl(168, 40%, 28%)",
            }}
          >
            {location.label}
          </div>
        </Html>
      )}
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
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color="hsl(168, 60%, 45%)" />
      <Globe />
      {LOCATION_POINTS.map((loc) => (
        <LocationMarker
          key={loc.value}
          location={loc}
          isSelected={value === loc.value}
          isHovered={hoveredLocation === loc.value}
          onSelect={() => {
            if (!disabled) onChange(loc.value);
          }}
          onHover={(h) => setHoveredLocation(h ? loc.value : null)}
        />
      ))}
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
  const selectedLabel = LOCATION_POINTS.find((l) => l.value === value)?.label ?? value;

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
        {/* Selected location badge */}
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
