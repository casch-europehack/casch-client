import { API_BASE_URL, ProfilingResult, CO2Result, AggregatedCO2Result } from "./types";
import { generateMockProfiling, generateMockCO2, generateMockAggregatedCO2 } from "./mock-data";

// Set to true to use mock data instead of real API calls
const USE_MOCK = true;
const MOCK_DELAY_MS = 1500;

// Cached mock profiling result so CO2 calls reference the same data
let cachedMockProfiling: ProfilingResult | null = null;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getCO2Emissions(fileHash: string, location: string): Promise<CO2Result> {
  if (USE_MOCK && cachedMockProfiling) {
    await delay(800);
    return generateMockCO2(cachedMockProfiling, location);
  }

  const response = await fetch(`${API_BASE_URL}/co2?file_hash=${encodeURIComponent(fileHash)}&location=${encodeURIComponent(location)}`);

  if (!response.ok) {
    throw new Error(`CO2 calculation failed: ${response.statusText}`);
  }

  return response.json();
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
    `${API_BASE_URL}/co2/aggregated?file_hash=${encodeURIComponent(fileHash)}&location=${encodeURIComponent(location)}&min_time_h=${minTimeH}`
  );

  if (!response.ok) {
    throw new Error(`Aggregated CO2 calculation failed: ${response.statusText}`);
  }

  return response.json();
}

export async function scheduleJob(
  fileHash: string,
  location: string,
  policyName: string
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK) {
    await delay(600);
    return { success: true, message: `Job scheduled with "${policyName}" policy in ${location}. Estimated start within 2 hours.` };
  }

  const response = await fetch(`${API_BASE_URL}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_hash: fileHash, location, policy: policyName }),
  });

  if (!response.ok) {
    throw new Error(`Scheduling failed: ${response.statusText}`);
  }

  return response.json();
}
