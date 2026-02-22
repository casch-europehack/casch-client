import { API_BASE_URL, ProfilingResult, ProfilingResponse, CO2Result, CO2Response, AggregatedCO2Result, CarbonIntensityMap } from "./types";
import { generateMockProfiling, generateMockCO2, generateMockAggregatedCO2 } from "./mock-data";

// Set to true to use mock data instead of real API calls
const USE_MOCK = false;
const MOCK_DELAY_MS = 1500;

// Cached mock profiling result so CO2 calls reference the same data
let cachedMockProfiling: ProfilingResult | null = null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCarbonIntensity(zones: string[]): Promise<CarbonIntensityMap> {
  const response = await fetch(
    `${API_BASE_URL}/carbon-intensity?zones=${encodeURIComponent(zones.join(","))}`,
    { headers: { "ngrok-skip-browser-warning": "true" } },
  );

  if (!response.ok) {
    throw new Error(`Carbon intensity fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result;
}

export async function analyzeFile(file: File): Promise<ProfilingResult> {
  if (USE_MOCK) {
    await delay(MOCK_DELAY_MS);
    cachedMockProfiling = generateMockProfiling();
    return cachedMockProfiling;
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    body: formData,
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  const data: ProfilingResponse = await response.json();
  
  // Attach the file_hash to the result object so the rest of the app works as expected
  const result = data.result;
  result.file_hash = data.file_hash;
  
  return result;
}

export async function getCO2Emissions(fileHash: string, location: string): Promise<CO2Result> {
  if (USE_MOCK && cachedMockProfiling) {
    await delay(800);
    return generateMockCO2(cachedMockProfiling, location);
  }

  const response = await fetch(`${API_BASE_URL}/co2?file_hash=${encodeURIComponent(fileHash)}&location=${encodeURIComponent(location)}`, {
    headers: {
      "ngrok-skip-browser-warning": "true",
    }
  });

  if (!response.ok) {
    throw new Error(`CO2 calculation failed: ${response.statusText}`);
  }

  const data: CO2Response = await response.json();
  return data.result;
}

export async function getAggregatedCO2(
  fileHash: string,
  location: string,
  minTimeH: number
): Promise<AggregatedCO2Result> {
  if (USE_MOCK && cachedMockProfiling) {
    await delay(1200);
    return generateMockAggregatedCO2(cachedMockProfiling, location, minTimeH);
  }

  const response = await fetch(
    `${API_BASE_URL}/aggregate?file_hash=${encodeURIComponent(fileHash)}&location=${encodeURIComponent(location)}`,
    { headers: { "ngrok-skip-browser-warning": "true" } },
  );

  if (!response.ok) {
    throw new Error(`Aggregated CO2 calculation failed: ${response.statusText}`);
  }

  const data = await response.json();
  const result = data.result;

  // Compute frontend fields
  result.execution_times_h = result.durations.map((d: number) => d / 3600);
  result.total_co2_g = result.co2_emissions;
  result.optimal_time_h = result.durations[result.durations.length - 1] / 3600;
  result.optimal_co2_g = result.optimised_co2;
  result.household_daily_co2_g = 22000; // ~22kg CO2/day avg EU household
  
  // Generate schedulable policies for the dropdown
  const n_optimal = result.num_optimal_pauses;
  const policies = [];
  
  // Baseline
  if (result.policy_ids && result.policy_ids.length > 0) {
    policies.push({
      name: result.policy_ids[0],
      time_h: result.durations[0] / 3600,
      co2_g: result.co2_emissions[0]
    });
    
    // Intermediate milestones
    if (n_optimal > 1) {
      for (const pct of [25, 50, 75]) {
        const n_cuts = Math.max(1, Math.round(n_optimal * pct / 100));
        if (n_cuts < n_optimal && n_cuts < result.policy_ids.length) {
          policies.push({
            name: result.policy_ids[n_cuts],
            time_h: result.durations[n_cuts] / 3600,
            co2_g: result.co2_emissions[n_cuts]
          });
        }
      }
    }
    
    // Optimal
    if (result.policy_ids.length > 1) {
      policies.push({
        name: result.policy_ids[result.policy_ids.length - 1],
        time_h: result.durations[result.durations.length - 1] / 3600,
        co2_g: result.co2_emissions[result.co2_emissions.length - 1]
      });
    }
  }
  
  result.policies = policies;

  return result;
}

export async function scheduleJob(
  file: File,
  location: string,
  policyName: string
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK) {
    await delay(600);
    return { success: true, message: `Job scheduled with "${policyName}" policy in ${location}. Estimated start within 2 hours.` };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("location", location);
  formData.append("policy", policyName);

  const response = await fetch(`${API_BASE_URL}/schedule`, {
    method: "POST",
    body: formData,
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!response.ok) {
    throw new Error(`Scheduling failed: ${response.statusText}`);
  }

  return response.json();
}
