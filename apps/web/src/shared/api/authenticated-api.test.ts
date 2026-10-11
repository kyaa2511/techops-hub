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

it('uses the selected tenant and overrides arbitrary caller tenant headers', async () => {
  const api = createAuthenticatedApiClient(async () => 'token', 'verified-org');
  await api('/api/v1/auth/context', { headers: { 'X-Organization-Id': 'other-org' } });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get('X-Organization-Id')).toBe('verified-org');
});

it('omits tenant headers from identity requests even if supplied by the caller', async () => {
  const api = createAuthenticatedApiClient(async () => 'token');
  await api('/api/v1/organizations', { headers: { 'X-Organization-Id': 'old-org' } });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).has('X-Organization-Id')).toBe(false);
});

it('rejects tenant requests without a session token', async () => {
  const api = createAuthenticatedApiClient(async () => null, 'org-a');
  await expect(api('/api/v1/auth/context')).rejects.toThrow('An authenticated session is required.');
});

it('does not send an aborted request after token acquisition', async () => {
  const controller = new AbortController();
  const api = createAuthenticatedApiClient(async () => { controller.abort(); return 'token'; }, 'org-a');
  const count = fetchMock.mock.calls.length;
  await expect(api('/api/v1/auth/context', { signal: controller.signal })).rejects.toThrow();
  expect(fetchMock.mock.calls.length).toBe(count);
});
