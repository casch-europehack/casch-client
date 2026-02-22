import { useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { AggregatedCO2Result } from "@/lib/types";
import { TrendingDown, Clock, Leaf } from "lucide-react";

interface ChartPoint {
  index: number;
  time_h: number;
  co2_g: number;
  policy_id: string;
  duration_s: number;
}

interface AggregatedCO2ChartProps {
  data: AggregatedCO2Result;
  selectedPolicy?: string;
  onSelectPolicy?: (policyId: string) => void;
}

export function AggregatedCO2Chart({ data, selectedPolicy, onSelectPolicy }: AggregatedCO2ChartProps) {
  const chartData: ChartPoint[] = useMemo(() => {
    return data.execution_times_h.map((time, i) => ({
      index: i,
      time_h: parseFloat(time.toFixed(2)),
      co2_g: parseFloat(data.total_co2_g[i].toFixed(2)),
      policy_id: data.policy_ids[i],
      duration_s: data.durations[i],
    }));
  }, [data]);

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
            Duration vs CO₂ Trade-off
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click any point to select your preferred trade-off
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
              dataKey="time_h"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Execution Time (h)",
                position: "insideBottom",
                offset: -10,
                style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <YAxis
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
              labelFormatter={(label: number, payload: any[]) => {
                const p = payload?.[0]?.payload;
                const policyLabel = p?.policy_id ? ` · ${p.policy_id}` : "";
                return `${label}h${policyLabel}`;
              }}
            />

            {selectedPoint && (
              <ReferenceDot
                x={selectedPoint.time_h}
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
                {selectedPoint.policy_id}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-display font-medium">{selectedPoint.time_h.toFixed(2)}h</span>
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
                {baselinePoint?.time_h.toFixed(2)}h · {baselinePoint?.co2_g.toFixed(2)}g
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Greenest</p>
              <p className="text-sm font-display font-semibold">
                {greenestPoint?.time_h.toFixed(2)}h · {greenestPoint?.co2_g.toFixed(2)}g
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
