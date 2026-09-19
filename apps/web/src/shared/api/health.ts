export interface HealthResponse {
  status: 'ok';
  database: 'connected';
  timestamp: string;
}

export function normalizeApiBaseUrl(apiBaseUrl?: string): string {
  if (!apiBaseUrl) {
    return '';
  }

  const url = new URL(apiBaseUrl);
  return url.origin;
}

export async function fetchHealth(apiBaseUrl?: string): Promise<HealthResponse> {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const response = await fetch(`${normalizedBaseUrl}/api/v1/health`);

  if (!response.ok) {
    throw new Error('Unable to reach the API health endpoint.');
  }

  return (await response.json()) as HealthResponse;
}
