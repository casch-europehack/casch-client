import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { CO2Result, LOCATIONS } from "@/lib/types";

interface CO2ChartProps {
  co2Data: CO2Result;
}

export function CO2Chart({ co2Data }: CO2ChartProps) {
  const chartData = useMemo(() => {
    if (!co2Data.ci_times_s || !co2Data.ci_values) return [];

    const data = [];
    for (let i = 0; i < co2Data.ci_times_s.length; i++) {
      const time_s = co2Data.ci_times_s[i];
      if (time_s > co2Data.job_duration_s) {
        // Add one final point exactly at job_duration_s to close the graph cleanly
        if (i > 0) {
          // Interpolate the CI value at job_duration_s
          const prevTime = co2Data.ci_times_s[i - 1];
          const prevCi = co2Data.ci_values[i - 1];
          const currTime = time_s;
          const currCi = co2Data.ci_values[i];
          
          const ratio = (co2Data.job_duration_s - prevTime) / (currTime - prevTime);
          const interpolatedCi = prevCi + ratio * (currCi - prevCi);
          
          data.push({
            time_s: co2Data.job_duration_s,
            ci: interpolatedCi,
          });
        }
        break;
      }
      
      data.push({
        time_s: time_s,
        ci: co2Data.ci_values[i],
      });
    }
    
    return data;
  }, [co2Data]);

  const useMinutes = co2Data.job_duration_s < 7200; // Use minutes if less than 2 hours

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card animate-slide-up">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">
            Carbon Intensity Forecast
          </h3>
          <p className="text-sm text-muted-foreground">
            Estimated CO₂ emissions for {LOCATIONS.find(l => l.value === co2Data.location)?.label || co2Data.location}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total Emissions</div>
          <div className="text-xl font-bold text-foreground">
            {co2Data.baseline_co2.toFixed(1)} gCO₂
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <defs>
              <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time_s"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(val) => useMinutes ? (val / 60).toFixed(0) : (val / 3600).toFixed(1)}
              label={{ value: useMinutes ? "Time (min)" : "Time (h)", position: "insideBottom", offset: -10, style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "gCO₂/kWh", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: 12,
              }}
              labelFormatter={(val) => useMinutes ? `Time: ${(Number(val) / 60).toFixed(1)} min` : `Time: ${(Number(val) / 3600).toFixed(1)} h`}
              formatter={(val: number) => [`${val.toFixed(1)} gCO₂/kWh`, "Carbon Intensity"]}
            />
            <Area
              type="monotone"
              dataKey="ci"
              stroke="hsl(var(--primary))"
              fill="url(#ciGradient)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
