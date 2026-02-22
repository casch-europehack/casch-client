import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ScheduleResult } from "@/lib/types";

interface ScheduledJobChartProps {
  data: ScheduleResult;
}

export function ScheduledJobChart({ data }: ScheduledJobChartProps) {
  const chartData = useMemo(() => {
    return data.step_energy_J.map((energy, i) => ({
      step: i + 1,
      energy_J: energy,
      throttle: data.throttles[i] ?? 1,
    }));
  }, [data]);

  const totalEnergy = useMemo(
    () => data.estimated_total_energy_Wh,
    [data]
  );

  const maxThrottle = useMemo(
    () => Math.max(...data.throttles, 1),
    [data]
  );

  const throttledSteps = useMemo(
    () => data.throttles.filter((t) => t < 1).length,
    [data]
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card animate-slide-up">
      <div className="mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">
          Scheduled Job — Energy &amp; Throttle Profile
        </h3>
        <p className="text-sm text-muted-foreground">
          Energy consumed per training step with the applied throttle schedule
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <defs>
              <linearGradient id="energyBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-energy))" stopOpacity={0.85} />
                <stop offset="95%" stopColor="hsl(var(--chart-energy))" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

            <XAxis
              dataKey="step"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Step",
                position: "insideBottom",
                offset: -2,
                style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
              }}
            />

            {/* Left axis — Energy */}
            <YAxis
              yAxisId="energy"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Energy (J)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
              }}
            />

            {/* Right axis — Throttle */}
            <YAxis
              yAxisId="throttle"
              orientation="right"
              domain={[0, maxThrottle * 1.1]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Throttle",
                angle: 90,
                position: "insideRight",
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
              formatter={(value: number, name: string) => {
                if (name === "energy_J") return [`${value.toFixed(4)} J`, "Energy"];
                return [`${value.toFixed(2)}×`, "Throttle"];
              }}
              labelFormatter={(label: number) => `Step ${label}`}
            />

            <Legend
              verticalAlign="top"
              height={30}
              formatter={(value: string) =>
                value === "energy_J" ? "Energy per step" : "Throttle"
              }
            />

            <Bar
              yAxisId="energy"
              dataKey="energy_J"
              fill="url(#energyBarGrad)"
              radius={[2, 2, 0, 0]}
              maxBarSize={40}
            />

            <Line
              yAxisId="throttle"
              type="stepAfter"
              dataKey="throttle"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
        <Stat label="Total Energy" value={`${totalEnergy.toFixed(2)} Wh`} />
        <Stat label="Total Steps" value={data.total_steps.toLocaleString()} />
        <Stat
          label="Throttled Steps"
          value={`${throttledSteps} / ${data.throttles.length}`}
        />
        <Stat label="Est. Duration" value={formatTime(data.estimated_total_time_s)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-display font-semibold text-foreground mt-0.5">
        {value}
      </p>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}
