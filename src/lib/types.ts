// API configuration - point this to your Python server
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface ProfilingResponse {
  status: string;
  message: string;
  file_hash: string;
  result: ProfilingResult;
}

export interface ProfilingResult {
  profiled_epochs: number;
  steps_per_epoch: number;
  total_epochs: number;
  total_steps: number;
  mean_energy_per_step_J: number;
  std_energy_per_step_J: number;
  mean_time_per_step_s: number;
  std_time_per_step_s: number;
  estimated_total_energy_Wh: number;
  estimated_total_time_s: number;
  profiled_step_energy_J: number[];
  profiled_step_time_s: number[];
  step_energy_J: number[];
  step_time_s: number[];
  power_timeseries: { time_s: number[]; power_W: number[] };
  power_intervals: { start_time_s: number[]; end_time_s: number[]; power_W: number[] };
  file_hash: string;
}

export interface CO2Result {
  co2_per_step: number[];
  total_co2_g: number;
  location: string;
  carbon_intensity_gCO2_per_kWh: number;
}

export interface AggregatedCO2Result {
  execution_times_h: number[];
  total_co2_g: number[];
  optimal_time_h: number;
  optimal_co2_g: number;
  household_daily_co2_g: number;
  policies: { name: string; time_h: number; co2_g: number }[];
}

export const LOCATIONS = [
  { value: "IE", label: "Dublin, Ireland" },
  { value: "PL", label: "Poland" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "SE", label: "Sweden" },
  { value: "US-CAL-CISO", label: "California, USA" },
  { value: "US-NY-NYIS", label: "New York, USA" },
  { value: "US-TEX-ERCO", label: "Texas, USA" },
  { value: "GB", label: "United Kingdom" },
  { value: "NO-NO1", label: "Norway" },
];
