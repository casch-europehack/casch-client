import { useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { AggregatedCO2Result } from "@/lib/types";
import { TrendingDown, Clock, Leaf, HelpCircle } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

/** Convert "step_100" → "Step: 100" */
function formatPolicyId(id: string): string {
  const m = id.match(/^step_(\d+)$/);
  return m ? `Step: ${m[1]}` : id;
}

interface ChartPoint {
  index: number;
  time_h: number;
  additional_s: number;
  additional_display: number;
  co2_g: number;
  policy_id: string;
  duration_s: number;
}

interface AggregatedCO2ChartProps {
  data: AggregatedCO2Result;
  selectedPolicy?: string;
  onSelectPolicy?: (policyId: string) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  return `${(seconds / 3600).toFixed(2)}h`;
}

export function AggregatedCO2Chart({ data, selectedPolicy, onSelectPolicy }: AggregatedCO2ChartProps) {
  const baselineDuration = data.durations[0] ?? 0;

  // Use minutes when the additional time range is less than 2 hours
  const maxAdditional = (data.durations[data.durations.length - 1] ?? 0) - baselineDuration;
  const useMinutes = maxAdditional < 7200;

  const chartData: ChartPoint[] = useMemo(() => {
    return data.execution_times_h.map((time, i) => {
      const additionalS = data.durations[i] - baselineDuration;
      return {
        index: i,
        time_h: parseFloat(time.toFixed(2)),
        additional_s: additionalS,
        additional_display: useMinutes
          ? parseFloat((additionalS / 60).toFixed(1))
          : parseFloat((additionalS / 3600).toFixed(2)),
        co2_g: parseFloat(data.total_co2_g[i].toFixed(2)),
        policy_id: data.policy_ids[i],
        duration_s: data.durations[i],
      };
    });
  }, [data, baselineDuration, useMinutes]);

  // Y-axis domain: start at the midpoint between 0 and the lowest value
  const [yMin, yMax] = useMemo(() => {
    const co2Values = chartData.map((p) => p.co2_g);
    const minVal = Math.min(...co2Values);
    const maxVal = Math.max(...co2Values);
    const padding = (maxVal - minVal) * 0.1 || 1;
    return [
      parseFloat((minVal / 2).toFixed(2)),
      parseFloat((maxVal + padding).toFixed(2)),
    ];
  }, [chartData]);

  const selectedPoint = useMemo(() => {
    if (!selectedPolicy) return null;
    return chartData.find((p) => p.policy_id === selectedPolicy) ?? null;
  }, [chartData, selectedPolicy]);

  const baselinePoint = chartData[0];
  const greenestPoint = chartData[chartData.length - 1];

  const savingsRange = baselinePoint && greenestPoint
    ? ((1 - greenestPoint.co2_g / baselinePoint.co2_g) * 100).toFixed(0)
    : null;

  const handleClick = useCallback(
    (point: ChartPoint) => {
      onSelectPolicy?.(point.policy_id);
    },
    [onSelectPolicy],
  );

  const CustomDot = useCallback(
    (props: any) => {
      const { cx, cy, payload } = props;
      if (!cx || !cy) return null;
      const isSelected = payload.policy_id === selectedPolicy;
      const isEndpoint = payload.index === 0 || payload.index === chartData.length - 1;

      return (
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 7 : isEndpoint ? 4 : 3}
          fill={isSelected ? "hsl(var(--chart-optimized))" : "hsl(var(--chart-co2))"}
          stroke={isSelected ? "hsl(var(--background))" : "none"}
          strokeWidth={isSelected ? 2.5 : 0}
          style={{ cursor: "pointer" }}
          onClick={() => handleClick(payload)}
        />
      );
    },
    [selectedPolicy, chartData, handleClick],
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card animate-slide-up">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            Additional Duration / CO₂ Savings Trade-off
            <TooltipProvider delayDuration={200}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-sm">
                  Carbon-aware scheduling saves CO₂ at the cost of slightly longer run times.
                  The x-axis shows the additional time your job will take, while the y-axis
                  shows the total CO₂ emitted. Select a point to choose your preferred balance.
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pick a point to trade a little extra time for lower emissions
          </p>
        </div>
        {savingsRange && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            Up to {savingsRange}% savings
          </span>
        )}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
            onClick={(state) => {
              if (state?.activePayload?.[0]?.payload) {
                handleClick(state.activePayload[0].payload);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="additional_display"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: useMinutes ? "Additional Time (min)" : "Additional Time (h)",
                position: "insideBottom",
                offset: -10,
                style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Total CO₂ (g)",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(2)} g`, "CO₂"]}
              labelFormatter={(_label: number, payload: any[]) => {
                const p = payload?.[0]?.payload;
                const policyLabel = p?.policy_id ? ` · ${formatPolicyId(p.policy_id)}` : "";
                const additional = p ? formatDuration(p.additional_s) : "";
                return `+${additional}${policyLabel}`;
              }}
            />

            {selectedPoint && (
              <ReferenceDot
                x={selectedPoint.additional_display}
                y={selectedPoint.co2_g}
                r={10}
                fill="hsl(var(--chart-optimized))"
                stroke="hsl(var(--background))"
                strokeWidth={3}
                isFront
              />
            )}

            <Line
              type="monotone"
              dataKey="co2_g"
              stroke="hsl(var(--chart-co2))"
              strokeWidth={2.5}
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: "hsl(var(--chart-co2))", cursor: "pointer" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Selected policy detail strip */}
      {selectedPoint ? (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-chart-optimized" />
              <span className="text-xs text-muted-foreground">Selected</span>
              <span className="text-sm font-display font-semibold text-foreground">
                {formatPolicyId(selectedPoint.policy_id)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-display font-medium">+{formatDuration(selectedPoint.additional_s)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              <span className="font-display font-medium">{selectedPoint.co2_g.toFixed(2)}g CO₂</span>
            </div>
            {baselinePoint && (
              <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                {((1 - selectedPoint.co2_g / baselinePoint.co2_g) * 100).toFixed(1)}% reduction
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Fastest (baseline)</p>
              <p className="text-sm font-display font-semibold">
                +0 min · {baselinePoint?.co2_g.toFixed(2)}g
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Greenest</p>
              <p className="text-sm font-display font-semibold">
                +{greenestPoint ? formatDuration(greenestPoint.additional_s) : ""} · {greenestPoint?.co2_g.toFixed(2)}g
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available trade-offs</p>
              <p className="text-sm font-display font-semibold">{chartData.length} options</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
