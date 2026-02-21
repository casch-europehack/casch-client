import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot,
} from "recharts";
import { AggregatedCO2Result } from "@/lib/types";
import { Home } from "lucide-react";

interface AggregatedCO2ChartProps {
  data: AggregatedCO2Result;
}

export function AggregatedCO2Chart({ data }: AggregatedCO2ChartProps) {
  const chartData = useMemo(() => {
    return data.execution_times_h.map((time, i) => ({
      time_h: parseFloat(time.toFixed(2)),
      co2_g: parseFloat(data.total_co2_g[i].toFixed(2)),
    }));
  }, [data]);

  const householdRatio = data.optimal_co2_g / data.household_daily_co2_g;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card animate-slide-up">
      <div className="mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">
          CO₂ vs Execution Time Trade-off
        </h3>
        <p className="text-sm text-muted-foreground">
          Scheduling your job to run longer can significantly reduce carbon emissions
        </p>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time_h"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Execution Time (h)", position: "insideBottom", offset: -2, style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Total CO₂ (g)", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(2)} g`, "CO₂"]}
            />
            <ReferenceLine
              y={data.household_daily_co2_g}
              stroke="hsl(var(--chart-comparison))"
              strokeDasharray="6 4"
              label={{
                value: `Avg household/day: ${data.household_daily_co2_g.toFixed(0)}g`,
                position: "right",
                style: { fontSize: 10, fill: "hsl(var(--chart-comparison))" },
              }}
            />
            <ReferenceDot
              x={data.optimal_time_h}
              y={data.optimal_co2_g}
              r={6}
              fill="hsl(var(--chart-optimized))"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="co2_g"
              stroke="hsl(var(--chart-co2))"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--chart-co2))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-chart-optimized mt-1.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Optimal Schedule</p>
            <p className="text-sm font-display font-semibold text-foreground">
              {data.optimal_time_h.toFixed(1)}h → {data.optimal_co2_g.toFixed(2)}g CO₂
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Home className="w-3.5 h-3.5 text-chart-comparison mt-1 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Household Comparison</p>
            <p className="text-sm font-display font-semibold text-foreground">
              {householdRatio < 1
                ? `${(householdRatio * 100).toFixed(1)}% of a household's daily emissions`
                : `${householdRatio.toFixed(1)}× a household's daily emissions`
              }
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Available Policies</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {data.policies.map((p) => (
              <span
                key={p.name}
                className="inline-block px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground font-medium"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
