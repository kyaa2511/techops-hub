import { jest } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.unstable_mockModule('@clerk/react', () => {
  const passthrough = ({ children }: { children: ReactNode }) => children;

  return {
    ClerkProvider: passthrough,
    SignInButton: passthrough,
    SignUpButton: passthrough,
    UserButton: () => null,
    useAuth: () => ({ isLoaded: true, isSignedIn: false, getToken: async () => null }),
  };
});

const { AppProviders } = await import('./app/providers.tsx');

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

  it('renders the signed-out authentication entry point', async () => {
    render(<AppProviders />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Welcome to TechOps Hub' })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
