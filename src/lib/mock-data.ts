import { ProfilingResult, CO2Result, AggregatedCO2Result } from "./types";

// Simulate realistic per-step energy with some noise
function generateStepData(count: number, mean: number, std: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    // Box-Muller for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    data.push(Math.max(0.001, mean + z * std));
  }
  return data;
}

// Carbon intensity by location (realistic gCO2/kWh values)
const CARBON_INTENSITY: Record<string, number> = {
  "IE": 296,
  "PL": 635,
  "DE": 338,
  "FR": 56,
  "SE": 41,
  "US-CAL-CISO": 210,
  "US-NY-NYIS": 180,
  "GB": 198,
  "NO-NO1": 26,
};

const LOCATION_NAMES: Record<string, string> = {
  "IE": "Dublin, Ireland",
  "PL": "Poland",
  "DE": "Germany",
  "FR": "France",
  "SE": "Sweden",
  "US-CAL-CISO": "California, USA",
  "US-NY-NYIS": "New York, USA",
  "GB": "United Kingdom",
  "NO-NO1": "Norway",
};

export function generateMockProfiling(): ProfilingResult {
  const profiled_epochs = 3;
  const steps_per_epoch = 50;
  const total_epochs = 20;
  const total_steps = steps_per_epoch * total_epochs;

  const mean_energy = 12.5; // J per step
  const std_energy = 1.8;
  const mean_time = 0.42; // s per step
  const std_time = 0.05;

  const profiled_step_energy_J = generateStepData(profiled_epochs * steps_per_epoch, mean_energy, std_energy);
  const profiled_step_time_s = generateStepData(profiled_epochs * steps_per_epoch, mean_time, std_time);

  // Tile profiled data to cover full run
  const step_energy_J: number[] = [];
  const step_time_s: number[] = [];
  for (let i = 0; i < total_steps; i++) {
    step_energy_J.push(profiled_step_energy_J[i % profiled_step_energy_J.length]);
    step_time_s.push(profiled_step_time_s[i % profiled_step_time_s.length]);
  }

  const estimated_total_energy_Wh = step_energy_J.reduce((a, b) => a + b, 0) / 3600;
  const estimated_total_time_s = step_time_s.reduce((a, b) => a + b, 0);

  // Compute power = energy / time per step
  const step_power = step_energy_J.map((e, i) => e / step_time_s[i]);
  const cum_times: number[] = [];
  step_time_s.reduce((acc, t, i) => { cum_times[i] = acc + t; return cum_times[i]; }, 0);

  // Generate timeseries at 1s resolution
  const totalTime = cum_times[cum_times.length - 1];
  const ts_time: number[] = [];
  const ts_power: number[] = [];
  for (let t = 0; t < totalTime; t += 1.0) {
    ts_time.push(parseFloat(t.toFixed(2)));
    const idx = cum_times.findIndex(ct => ct > t);
    ts_power.push(idx >= 0 ? parseFloat(step_power[idx].toFixed(4)) : 0);
  }

  // Generate intervals
  const start_times = [0, ...cum_times.slice(0, -1)];

  return {
    profiled_epochs,
    steps_per_epoch,
    total_epochs,
    total_steps,
    mean_energy_per_step_J: mean_energy,
    std_energy_per_step_J: std_energy,
    mean_time_per_step_s: mean_time,
    std_time_per_step_s: std_time,
    estimated_total_energy_Wh,
    estimated_total_time_s,
    profiled_step_energy_J,
    profiled_step_time_s,
    step_energy_J,
    step_time_s,
    power_timeseries: { time_s: ts_time, power_W: ts_power },
    power_intervals: {
      start_time_s: start_times.map(t => parseFloat(t.toFixed(2))),
      end_time_s: cum_times.map(t => parseFloat(t.toFixed(2))),
      power_W: step_power.map(p => parseFloat(p.toFixed(4))),
    },
    file_hash: `mock_${Date.now()}`,
  };
}

export function generateMockCO2(profiling: ProfilingResult, location: string): CO2Result {
  const intensity = CARBON_INTENSITY[location] || 300;
  
  // CO2 per step = energy_J * (1 Wh / 3600 J) * (1 kWh / 1000 Wh) * intensity
  const co2_per_step = profiling.step_energy_J.map(
    (e) => (e / 3600 / 1000) * intensity
  );
  const total_co2_g = co2_per_step.reduce((a, b) => a + b, 0);

  return {
    co2_per_step,
    total_co2_g,
    location: LOCATION_NAMES[location] || location,
    carbon_intensity_gCO2_per_kWh: intensity,
  };
}

export function generateMockAggregatedCO2(
  profiling: ProfilingResult,
  location: string,
  _minTimeH: number
): AggregatedCO2Result {
  const intensity = CARBON_INTENSITY[location] || 300;
  const baseEnergyWh = profiling.estimated_total_energy_Wh;
  const baseTimeH = profiling.estimated_total_time_s / 3600;
  const baseCO2 = (baseEnergyWh / 1000) * intensity;

  // Generate curve: longer execution → lower CO2 (diminishing returns)
  const points = 30;
  const execution_times_h: number[] = [];
  const total_co2_g: number[] = [];

  for (let i = 0; i < points; i++) {
    const timeMultiplier = 1 + (i / (points - 1)) * 4; // 1x to 5x base time
    const time = baseTimeH * timeMultiplier;
    // CO2 decreases as we spread computation: simulate picking greener time slots
    const co2Reduction = 1 - 0.55 * (1 - Math.exp(-0.8 * (timeMultiplier - 1)));
    execution_times_h.push(parseFloat(time.toFixed(2)));
    total_co2_g.push(parseFloat((baseCO2 * co2Reduction).toFixed(2)));
  }

  const optimalIdx = Math.floor(points * 0.6);

  return {
    execution_times_h,
    total_co2_g,
    optimal_time_h: execution_times_h[optimalIdx],
    optimal_co2_g: total_co2_g[optimalIdx],
    household_daily_co2_g: 22000, // ~22kg CO2/day avg EU household
    policies: [
      { name: "Fastest", time_h: execution_times_h[0], co2_g: total_co2_g[0] },
      { name: "Balanced", time_h: execution_times_h[optimalIdx], co2_g: total_co2_g[optimalIdx] },
      { name: "Greenest", time_h: execution_times_h[points - 1], co2_g: total_co2_g[points - 1] },
      { name: "Off-Peak", time_h: execution_times_h[Math.floor(points * 0.4)], co2_g: total_co2_g[Math.floor(points * 0.4)] },
    ],
  };
}
