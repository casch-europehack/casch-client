import { API_BASE_URL, ProfilingResult, CO2Result, AggregatedCO2Result } from "./types";

export async function analyzeFile(file: File): Promise<ProfilingResult> {
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
