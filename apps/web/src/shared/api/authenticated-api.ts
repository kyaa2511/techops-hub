import { useAuth } from '@clerk/react';
import { useOrganization } from '../../auth/organization-context.ts';
import { apiBaseUrl } from './api-config.ts';

export function createAuthenticatedApiClient(getToken: () => Promise<string | null>, organizationId?: string) {
  return async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
    const token = await getToken();
    if (init?.signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    if (organizationId && !token) throw new Error('An authenticated session is required.');
    const headers = new Headers(init?.headers);
    headers.delete('X-Organization-Id');
    if (organizationId) headers.set('X-Organization-Id', organizationId);

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

/** Use with tenantQueryKey and the query's AbortSignal for tenant resources. */
export function useOrganizationApi() {
  const { getToken } = useAuth();
  const { organization, revoke } = useOrganization();
  const api = createAuthenticatedApiClient(getToken, organization.organizationId);
  return async (path: string, init?: RequestInit) => {
    const response = await api(path, init);
    if (init?.signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    if (response.status === 401 || response.status === 403) revoke();
    return response;
  };
}
