import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import * as topojson from "topojson-client";
import earcut from "earcut";

const GLOBE_RADIUS = 2;

interface LocationEntry {
  value: string;
  label: string;
  lat: number;
  lng: number;
  isoCode: string;
}

const LOCATIONS: LocationEntry[] = [
  { value: "IE", label: "Dublin, Ireland", lat: 53.35, lng: -6.26, isoCode: "372" },
  { value: "PL", label: "Poland", lat: 52.23, lng: 21.01, isoCode: "616" },
  { value: "DE", label: "Germany", lat: 51.17, lng: 10.45, isoCode: "276" },
  { value: "FR", label: "France", lat: 46.6, lng: 1.89, isoCode: "250" },
  { value: "SE", label: "Sweden", lat: 60.13, lng: 18.64, isoCode: "752" },
  { value: "US-CAL-CISO", label: "California, USA", lat: 36.78, lng: -119.42, isoCode: "840" },
  { value: "US-NY-NYIS", label: "New York, USA", lat: 40.71, lng: -74.01, isoCode: "840" },
  { value: "GB", label: "United Kingdom", lat: 55.38, lng: -3.44, isoCode: "826" },
  { value: "NO-NO1", label: "Norway", lat: 60.47, lng: 8.47, isoCode: "578" },
];

export { LOCATIONS };

export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 70) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function polygonToGeometry(
  ring: number[][],
  holes: number[][][],
  radius: number,
): THREE.BufferGeometry | null {
  if (!ring || ring.length < 3) return null;

  const flatCoords: number[] = [];
  for (const [lng, lat] of ring) {
    flatCoords.push(lng, lat);
  }

  const holeIndices: number[] = [];
  for (const hole of holes) {
    holeIndices.push(flatCoords.length / 2);
    for (const [lng, lat] of hole) {
      flatCoords.push(lng, lat);
    }
  }

  const indices = earcut(flatCoords, holeIndices.length > 0 ? holeIndices : undefined, 2);
  if (indices.length === 0) return null;

  const totalPoints = flatCoords.length / 2;
  const positions = new Float32Array(totalPoints * 3);
  for (let i = 0; i < totalPoints; i++) {
    const lng = flatCoords[i * 2];
    const lat = flatCoords[i * 2 + 1];
    const v = latLngToVector3(lat, lng, radius + 0.02);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(Array.from(indices));
  geometry.computeVertexNormals();
  return geometry;
}

interface GeoFeature {
  type: string;
  id: string;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

function getPolygons(feature: GeoFeature): { ring: number[][]; holes: number[][][] }[] {
  if (feature.geometry.type === "Polygon") {
    const coords = feature.geometry.coordinates as number[][][];
    return [{ ring: coords[0], holes: coords.slice(1) }];
  } else if (feature.geometry.type === "MultiPolygon") {
    const coords = feature.geometry.coordinates as number[][][][];
    return coords.map((polygon) => ({
      ring: polygon[0],
      holes: polygon.slice(1),
    }));
  }
  return [];
}

function CountryShape({
  geometries,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: {
  geometries: THREE.BufferGeometry[];
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}) {
  const color = isSelected
    ? "hsl(168, 60%, 50%)"
    : isHovered
      ? "hsl(38, 80%, 55%)"
      : "hsl(168, 55%, 30%)";

  const opacity = isSelected ? 0.7 : isHovered ? 0.6 : 0.3;
  const emissive = isSelected
    ? "hsl(168, 60%, 30%)"
    : isHovered
      ? "hsl(38, 70%, 30%)"
      : "hsl(168, 55%, 10%)";

  return (
    <group>
      {geometries.map((geo, i) => (
        <mesh
          key={i}
          geometry={geo}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
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
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.4 : 0.2}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface CountryOverlaysProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CountryOverlays({ value, onChange, disabled }: CountryOverlaysProps) {
  const [geoData, setGeoData] = useState<GeoFeature[] | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  useEffect(() => {
    fetch("/countries-110m.json")
      .then((r) => r.json())
      .then((topology) => {
        const countries = topojson.feature(
          topology,
          topology.objects.countries,
        );
        setGeoData((countries as any).features as GeoFeature[]);
      });
  }, []);

  // Group locations by ISO code to avoid duplicate shapes
  const isoGroups = useMemo(() => {
    const groups: Record<string, LocationEntry[]> = {};
    for (const loc of LOCATIONS) {
      if (!groups[loc.isoCode]) groups[loc.isoCode] = [];
      groups[loc.isoCode].push(loc);
    }
    return groups;
  }, []);

  // Build geometries per ISO code
  const shapeData = useMemo(() => {
    if (!geoData) return [];

    const result: {
      isoCode: string;
      locations: LocationEntry[];
      geometries: THREE.BufferGeometry[];
    }[] = [];

    for (const [isoCode, locations] of Object.entries(isoGroups)) {
      const feature = geoData.find((f) => f.id === isoCode);
      if (!feature) continue;

      const polygons = getPolygons(feature);
      const geos: THREE.BufferGeometry[] = [];

      for (const { ring, holes } of polygons) {
        const geo = polygonToGeometry(ring, holes, GLOBE_RADIUS);
        if (geo) geos.push(geo);
      }

      if (geos.length > 0) {
        result.push({ isoCode, locations, geometries: geos });
      }
    }

    return result;
  }, [geoData, isoGroups]);

  if (!geoData) return null;

  return (
    <group>
      {shapeData.map(({ isoCode, locations, geometries }) => {
        const isSelected = locations.some((l) => l.value === value);
        const isHovered = locations.some((l) => l.value === hoveredLocation);
        // Use the first location for label, or the selected one
        const displayLoc = locations.find((l) => l.value === value) || locations[0];

        return (
          <group key={isoCode}>
            <CountryShape
              geometries={geometries}
              isSelected={isSelected}
              isHovered={isHovered}
              onClick={() => {
                if (disabled) return;
                // If multiple locations share this country, cycle through them
                if (locations.length === 1) {
                  onChange(locations[0].value);
                } else {
                  const currentIdx = locations.findIndex((l) => l.value === value);
                  const nextIdx = (currentIdx + 1) % locations.length;
                  onChange(locations[nextIdx].value);
                }
              }}
              onHover={(h) => setHoveredLocation(h ? locations[0].value : null)}
            />
            {(isHovered || isSelected) && (
              <Html
                position={latLngToVector3(
                  displayLoc.lat,
                  displayLoc.lng,
                  GLOBE_RADIUS + 0.15,
                ).toArray() as [number, number, number]}
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
                  {displayLoc.label}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
