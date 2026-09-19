import { jest } from '@jest/globals';
import { fetchHealth, normalizeApiBaseUrl } from './health.ts';

const fetchMock = jest.fn<typeof fetch>();

describe('health API client', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  it('normalizes override URLs to their origin', () => {
    expect(normalizeApiBaseUrl('https://api.example.com/root/path')).toBe('https://api.example.com');
  });

  it('returns parsed JSON when the response is ok', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        database: 'connected',
        timestamp: '2026-09-19T00:00:00.000Z',
      }),
    } as Response);

    await expect(fetchHealth('https://api.example.com')).resolves.toEqual({
      status: 'ok',
      database: 'connected',
      timestamp: '2026-09-19T00:00:00.000Z',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/v1/health');
  });

  it('throws when the response is not ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
    } as Response);

    await expect(fetchHealth('https://api.example.com')).rejects.toThrow(
      'Unable to reach the API health endpoint.',
    );
  });
});
