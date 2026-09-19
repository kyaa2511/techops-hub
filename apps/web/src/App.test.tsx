import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProviders } from './app/providers.tsx';

const fetchMock = jest.fn<typeof fetch>(async () =>
  ({
    ok: true,
    json: async () => ({
      status: 'ok',
      database: 'connected',
      timestamp: '2026-09-19T00:00:00.000Z',
    }),
  }) as Response,
);

describe('AppProviders', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockClear();
  });

  it('renders the sprint 0 dashboard shell', async () => {
    render(<AppProviders />);

    expect(screen.getByRole('heading', { name: 'TechOps Hub' })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/health');
    });
  });
});
