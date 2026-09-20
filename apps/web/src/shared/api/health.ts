import { apiBaseUrl } from './api-config.ts';

export interface HealthResponse {
  status: 'ok';
  database: 'connected';
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/health`);

  if (!response.ok) {
    throw new Error('Unable to reach the API health endpoint.');
  }

  return (await response.json()) as HealthResponse;
}
