import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { CO2Result, ProfilingResult } from "@/lib/types";

interface CO2ChartProps {
  profilingData: ProfilingResult;
  co2Data: CO2Result;
}

export function CO2Chart({ profilingData, co2Data }: CO2ChartProps) {
  const chartData = useMemo(() => {
    let cumulativeTime = 0;
    return co2Data.co2_per_step.map((co2, i) => {
      cumulativeTime += profilingData.step_time_s[i] || 0;
      return {
        step: i + 1,
        time_s: parseFloat(cumulativeTime.toFixed(2)),
        co2_g: parseFloat(co2.toFixed(6)),
      };
    });
  }, [co2Data, profilingData]);

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card animate-slide-up">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">
            CO₂ Emissions
          </h3>
          <p className="text-sm text-muted-foreground">
            Estimated carbon emissions per step for {co2Data.location}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display font-bold text-accent">{co2Data.total_co2_g.toFixed(2)}g</p>
          <p className="text-xs text-muted-foreground">total CO₂</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-co2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-co2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time_s"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Time (s)", position: "insideBottom", offset: -2, style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "CO₂ (g)", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="co2_g"
              stroke="hsl(var(--chart-co2))"
              fill="url(#co2Gradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Carbon intensity: <span className="font-semibold text-foreground">{co2Data.carbon_intensity_gCO2_per_kWh} gCO₂/kWh</span> in {co2Data.location}
        </p>
      </div>
    </div>
  );
}
