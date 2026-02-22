import { useQuery } from "@tanstack/react-query";
import { getCarbonIntensity } from "@/lib/api";
import { LOCATIONS } from "@/components/CountryOverlay";
import { CarbonIntensityMap } from "@/lib/types";

const FALLBACK_INTENSITY: CarbonIntensityMap = {
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

const ZONE_CODES = LOCATIONS.map((l) => l.value);

export function useCarbonIntensity() {
  const { data, isLoading, error } = useQuery<CarbonIntensityMap>({
    queryKey: ["carbon-intensity", ZONE_CODES],
    queryFn: () => getCarbonIntensity(ZONE_CODES),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const intensityMap: Record<string, number> = {};
  for (const zone of ZONE_CODES) {
    const live = data?.[zone];
    intensityMap[zone] =
      live != null ? live : (FALLBACK_INTENSITY[zone] as number) ?? 300;
  }

  return { carbonIntensity: intensityMap, isLoading, error, isLive: !!data };
}
