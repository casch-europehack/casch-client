import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import earcut from "earcut";

const GLOBE_RADIUS = 2;

interface LocationEntry {
  value: string;
  label: string;
  lat: number;
  lng: number;
  geoId: string;
  source: "country" | "us-state";
}

const LOCATIONS: LocationEntry[] = [
  { value: "IE", label: "Dublin, Ireland", lat: 53.35, lng: -6.26, geoId: "372", source: "country" },
  { value: "PL", label: "Poland", lat: 52.23, lng: 21.01, geoId: "616", source: "country" },
  { value: "DE", label: "Germany", lat: 51.17, lng: 10.45, geoId: "276", source: "country" },
  { value: "FR", label: "France", lat: 46.6, lng: 1.89, geoId: "250", source: "country" },
  { value: "SE", label: "Sweden", lat: 60.13, lng: 18.64, geoId: "752", source: "country" },
  { value: "US-CAL-CISO", label: "California, USA", lat: 36.78, lng: -119.42, geoId: "06", source: "us-state" },
  { value: "US-NY-NYIS", label: "New York, USA", lat: 42.16, lng: -74.95, geoId: "36", source: "us-state" },
  { value: "US-TEX-ERCO", label: "Texas, USA", lat: 31.97, lng: -99.9, geoId: "48", source: "us-state" },
  { value: "GB", label: "United Kingdom", lat: 55.38, lng: -3.44, geoId: "826", source: "country" },
  { value: "NO-NO1", label: "Norway", lat: 60.47, lng: 8.47, geoId: "578", source: "country" },
];

export { LOCATIONS };

// Export carbon intensity data so other components can use it
export const CARBON_INTENSITY: Record<string, number> = {
  IE: 296,
  PL: 635,
  DE: 338,
  FR: 56,
  SE: 41,
  "US-CAL-CISO": 210,
  "US-NY-NYIS": 180,
  "US-TEX-ERCO": 396,
  GB: 198,
  "NO-NO1": 26,
};

export function intensityToColor(intensity: number): { color: string; emissive: string; label: string } {
  if (intensity <= 100) {
    const hue = 120;
    return { color: `hsl(${hue}, 65%, 45%)`, emissive: `hsl(${hue}, 65%, 25%)`, label: "Low" };
  } else if (intensity <= 300) {
    const t = (intensity - 100) / 200;
    const hue = 120 - t * 60;
    return { color: `hsl(${hue}, 70%, 45%)`, emissive: `hsl(${hue}, 70%, 25%)`, label: "Medium" };
  } else {
    const t = Math.min((intensity - 300) / 400, 1);
    const hue = 60 - t * 60;
    return { color: `hsl(${hue}, 80%, 45%)`, emissive: `hsl(${hue}, 80%, 25%)`, label: "High" };
  }
}

export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function polygonToGeometry(ring: number[][], holes: number[][][], radius: number): THREE.BufferGeometry | null {
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
  intensityColor,
  onClick,
  onHover,
}: {
  geometries: THREE.BufferGeometry[];
  isSelected: boolean;
  isHovered: boolean;
  intensityColor: { color: string; emissive: string; label: string };
  onClick: () => void;
  onHover: (h: boolean) => void;
}) {
  // Selected: bright color, high opacity, strong glow
  // Hovered: accent highlight
  // Default: subtle
  const color = isHovered && !isSelected ? "hsl(38, 80%, 55%)" : intensityColor.color;
  const emissive = isHovered && !isSelected ? "hsl(38, 70%, 30%)" : intensityColor.emissive;
  const opacity = isSelected ? 0.85 : isHovered ? 0.6 : 0.35;
  const emissiveIntensity = isSelected ? 0.8 : isHovered ? 0.4 : 0.15;
  // Selected countries render slightly above the globe surface for emphasis
  const scale = isSelected ? 1.015 : 1;

  return (
    <group scale={[scale, scale, scale]}>
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
            emissiveIntensity={emissiveIntensity}
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
  const [countryFeatures, setCountryFeatures] = useState<GeoFeature[] | null>(null);
  const [stateFeatures, setStateFeatures] = useState<GeoFeature[] | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/countries-110m.json").then((r) => r.json()),
      fetch("/us-states-10m.json").then((r) => r.json()),
    ]).then(([countryTopo, stateTopo]) => {
      const countries = topojson.feature(countryTopo, countryTopo.objects.countries);
      setCountryFeatures((countries as any).features as GeoFeature[]);

      const states = topojson.feature(stateTopo, stateTopo.objects.states);
      setStateFeatures((states as any).features as GeoFeature[]);
    });
  }, []);

  const shapeData = useMemo(() => {
    if (!countryFeatures || !stateFeatures) return [];

    const result: {
      location: LocationEntry;
      geometries: THREE.BufferGeometry[];
    }[] = [];

    for (const loc of LOCATIONS) {
      const features = loc.source === "country" ? countryFeatures : stateFeatures;
      const feature = features.find((f) => f.id === loc.geoId);
      if (!feature) continue;

      const polygons = getPolygons(feature);
      const geos: THREE.BufferGeometry[] = [];

      for (const { ring, holes } of polygons) {
        const geo = polygonToGeometry(ring, holes, GLOBE_RADIUS);
        if (geo) geos.push(geo);
      }

      if (geos.length > 0) {
        result.push({ location: loc, geometries: geos });
      }
    }

    return result;
  }, [countryFeatures, stateFeatures]);

  if (!countryFeatures || !stateFeatures) return null;

  return (
    <group>
      {shapeData.map(({ location, geometries }) => {
        const isSelected = value === location.value;
        const isHovered = hoveredLocation === location.value;

        const intensity = CARBON_INTENSITY[location.value] || 300;
        const intColor = intensityToColor(intensity);

        return (
          <group key={location.value}>
            <CountryShape
              geometries={geometries}
              isSelected={isSelected}
              isHovered={isHovered}
              intensityColor={intColor}
              onClick={() => {
                if (!disabled) onChange(location.value);
              }}
              onHover={(h) => setHoveredLocation(h ? location.value : null)}
            />
          </group>
        );
      })}
    </group>
  );
}
