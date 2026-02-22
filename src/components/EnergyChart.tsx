import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ProfilingResult } from "@/lib/types";

interface EnergyChartProps {
  data: ProfilingResult;
}

export function EnergyChart({ data }: EnergyChartProps) {
  const chartData = useMemo(() => {
    return data.power_timeseries.time_s.map((t, i) => ({
      time_s: t,
      power_W: data.power_timeseries.power_W[i],
    }));
  }, [data]);

  const avgPower = useMemo(() => {
    const powers = data.power_timeseries.power_W;
    return powers.reduce((a, b) => a + b, 0) / powers.length;
  }, [data]);

  const peakPower = useMemo(() => Math.max(...data.power_timeseries.power_W), [data]);

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card animate-slide-up">
      <div className="mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">
          Power Consumption
        </h3>
        <p className="text-sm text-muted-foreground">
          Instantaneous power output over time
        </p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-energy))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-energy))" stopOpacity={0} />
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
              label={{ value: "Power (W)", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(2)} W`, "Power"]}
              labelFormatter={(label: number) => `${label.toFixed(1)}s`}
            />
            <Area
              type="stepAfter"
              dataKey="power_W"
              stroke="hsl(var(--chart-energy))"
              fill="url(#powerGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
        <Stat label="Total Energy" value={`${data.estimated_total_energy_Wh.toFixed(2)} Wh`} />
        <Stat label="Avg Power" value={`${avgPower.toFixed(2)} W`} />
        <Stat label="Peak Power" value={`${peakPower.toFixed(2)} W`} />
        <Stat label="Est. Duration" value={formatTime(data.estimated_total_time_s)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-display font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}
