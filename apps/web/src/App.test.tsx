import { jest } from '@jest/globals';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const { AuthGate } = await import('./auth/auth-gate.tsx');
const { AuthConfigurationContext } = await import('./auth/auth-configuration.ts');

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

function renderWorkspaceRoute(publishableKey?: string) {
  const router = createMemoryRouter([
    {
      path: '/app',
      element: <AuthGate><div>Protected workspace</div></AuthGate>,
    },
  ], { initialEntries: ['/app'] });

  return render(
    <AuthConfigurationContext.Provider value={publishableKey}>
      <RouterProvider router={router} />
    </AuthConfigurationContext.Provider>,
  );
}

describe('AppProviders', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockClear();
  });

  it('shows the signed-out entry point at /app when Clerk is configured', async () => {
    renderWorkspaceRoute('pk_test_explicit_fake_key');

    expect(await screen.findByText('Sign in or create an account to continue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('shows the unconfigured-key fallback at /app', async () => {
    renderWorkspaceRoute();

    expect(await screen.findByText('Workspace sign-in is not configured in this environment.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore the demo' })).toHaveAttribute('href', '/demo');
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
    expect(document.querySelector('.demo-dialog .detail-content')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Ticket status' }));
    await user.click(screen.getByRole('option', { name: 'Completed' }));
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Laptop running slowly after startup' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset demo' }));
    expect(screen.getByRole('button', { name: 'Laptop running slowly after startup' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  }, 15000);

  it('removes a completed ticket from attention and updates the count', async () => {
    const user = userEvent.setup();
    render(<AppProviders />);
    const attention = within(screen.getByRole('heading', { name: 'Needs attention' }).closest('section')!);

    expect(attention.getByText('2', { selector: '.attention-count' })).toBeInTheDocument();
    await user.click(attention.getByRole('button', { name: /Replace laptop battery/ }));
    await user.click(screen.getByRole('combobox', { name: 'Ticket status' }));
    await user.click(screen.getByRole('option', { name: 'Completed' }));

    expect(attention.queryByRole('button', { name: /Replace laptop battery/ })).not.toBeInTheDocument();
    expect(attention.getByText('1', { selector: '.attention-count' })).toBeInTheDocument();
  }, 15000);

  it('marks the active demo navigation link as the current page', () => {
    render(<AppProviders />);

    expect(screen.getByRole('link', { name: /Overview/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Service tickets/ })).not.toHaveAttribute('aria-current');
  });
});
