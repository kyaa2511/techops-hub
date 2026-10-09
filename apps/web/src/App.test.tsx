import { jest } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  it('renders the public demo without making API requests', async () => {
    render(<AppProviders publishableKey="pk_test_explicit_fake_key" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Your workday, at a glance.' })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('lets a visitor inspect a ticket and update only its demo status', async () => {
    const user = userEvent.setup();
    render(<AppProviders />);
    await user.click(screen.getByRole('button', { name: 'Laptop running slowly after startup' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('TH-1042');
    await user.click(screen.getByRole('combobox', { name: 'Ticket status' }));
    await user.click(screen.getByRole('option', { name: 'Completed' }));
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Laptop running slowly after startup' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset demo' }));
    expect(screen.getByRole('button', { name: 'Laptop running slowly after startup' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  }, 15000);
});
