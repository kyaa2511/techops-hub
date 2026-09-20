import { jest } from '@jest/globals';
import { createAuthenticatedApiClient } from './authenticated-api.ts';

const fetchMock = jest.fn<typeof fetch>();

describe('createAuthenticatedApiClient', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true } as Response);
  });

  it('calls getToken for every request', async () => {
    const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const authenticatedFetch = createAuthenticatedApiClient(getToken);

    await authenticatedFetch('/api/v1/auth/session');

    expect(getToken).toHaveBeenCalledTimes(1);
  });

  it('sends a Bearer authorization header when a token is available', async () => {
    const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue('test-session-token');
    const authenticatedFetch = createAuthenticatedApiClient(getToken);

    await authenticatedFetch('/api/v1/auth/session');

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-session-token');
  });

  it('does not invent an Authorization header when no token is available', async () => {
    const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const authenticatedFetch = createAuthenticatedApiClient(getToken);

    await authenticatedFetch('/api/v1/auth/session');

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('preserves caller-supplied headers alongside the authorization header', async () => {
    const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue('test-session-token');
    const authenticatedFetch = createAuthenticatedApiClient(getToken);

    await authenticatedFetch('/api/v1/auth/session', {
      headers: { 'X-Custom-Header': 'custom-value' },
    });

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Custom-Header')).toBe('custom-value');
    expect(headers.get('Authorization')).toBe('Bearer test-session-token');
  });

  it('requests the configured API base URL and path', async () => {
    const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue(null);
    const authenticatedFetch = createAuthenticatedApiClient(getToken);

    await authenticatedFetch('/api/v1/auth/session');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/auth/session');
  });
});
