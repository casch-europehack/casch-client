import { LOCATIONS } from "./CountryOverlay";
import { ScrollArea } from "@/components/ui/scroll-area";

const CARBON_INTENSITY: Record<string, number> = {
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

function intensityToColor(intensity: number): { color: string; label: string } {
  if (intensity <= 100) {
    return { color: "hsl(120, 65%, 45%)", label: "Low" };
  } else if (intensity <= 300) {
    const t = (intensity - 100) / 200;
    const hue = 120 - t * 60;
    return { color: `hsl(${hue}, 70%, 45%)`, label: "Medium" };
  } else {
    const t = Math.min((intensity - 300) / 400, 1);
    const hue = 60 - t * 60;
    return { color: `hsl(${hue}, 80%, 45%)`, label: "High" };
  }
}

interface LocationListProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationList({ value, onChange, disabled }: LocationListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border">
        <h3 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
          Locations
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {LOCATIONS.map((loc) => {
            const intensity = CARBON_INTENSITY[loc.value] || 300;
            const intColor = intensityToColor(intensity);
            const isSelected = value === loc.value;

            return (
              <button
                key={loc.value}
                onClick={() => !disabled && onChange(loc.value)}
                disabled={disabled}
                className={`w-full text-left px-2.5 py-2 rounded-md transition-colors text-sm ${
                  isSelected
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/60 border border-transparent"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="font-display font-medium text-foreground text-xs leading-tight">
                  {loc.label}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: intColor.color }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {intensity} gCO₂/kWh · {intColor.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
