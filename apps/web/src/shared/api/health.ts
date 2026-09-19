export interface HealthResponse {
  status: 'ok';
  database: 'connected';
  timestamp: string;
}

export async function fetchHealth(apiBaseUrl?: string): Promise<HealthResponse> {
  const normalizedBaseUrl = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : '';
  const response = await fetch(`${normalizedBaseUrl}/api/v1/health`);

  if (!response.ok) {
    throw new Error('Unable to reach the API health endpoint.');
  }

  return (await response.json()) as HealthResponse;
}
