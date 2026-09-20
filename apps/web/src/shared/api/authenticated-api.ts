import { useAuth } from '@clerk/react';
import { apiBaseUrl } from './api-config.ts';

export function createAuthenticatedApiClient(getToken: () => Promise<string | null>) {
  return async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
    const token = await getToken();
    const headers = new Headers(init?.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  };
}

export function useAuthenticatedApi() {
  const { getToken } = useAuth();
  return createAuthenticatedApiClient(getToken);
}
