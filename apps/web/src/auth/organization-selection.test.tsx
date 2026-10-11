import { jest } from '@jest/globals';
import { StrictMode, useEffect } from 'react';
import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

let identity = { isLoaded: true, isSignedIn: true, userId: 'user-a', sessionId: 'session-a', getToken: async () => 'token-a' };
jest.unstable_mockModule('@clerk/react', () => ({
  useAuth: () => identity,
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
}));
const { OrganizationSelection } = await import('./organization-selection.tsx');
const { useOrganization, tenantQueryKey } = await import('./organization-context.ts');
const { useOrganizationApi } = await import('../shared/api/authenticated-api.ts');
const { AuthGate } = await import('./auth-gate.tsx');
const { AuthConfigurationContext } = await import('./auth-configuration.ts');
const orgs = [
  { organizationId: 'org-a', name: 'Alpha', slug: 'alpha', membershipId: 'member-a', role: 'OWNER' },
  { organizationId: 'org-b', name: 'Beta', slug: 'beta', membershipId: 'member-b', role: 'MEMBER' },
];
function response(data: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => data } as Response;
}
function context(id: string) {
  return response({ authenticated: true, userId: 'local-user', organizationId: id, membershipId: `member-${id}`, role: id === 'org-a' ? 'OWNER' : 'MEMBER' });
}
const fetchMock = jest.fn<typeof fetch>();
let workspaceClient: QueryClient;
function Workspace() {
  const { identityId, organization } = useOrganization();
  const api = useOrganizationApi();
  const currentClient = useQueryClient();
  useEffect(() => { workspaceClient = currentClient; }, [currentClient]);
  const data = useQuery({
    queryKey: tenantQueryKey(identityId, organization.organizationId, 'example'),
    queryFn: async ({ signal }) => {
      const result = await api('/tenant-example', { signal });
      if (!result.ok) throw new Error('Denied');
      return result.json() as Promise<{ label: string }>;
    },
  });
  return <div>Workspace {organization.name}: {data.data?.label ?? 'loading'}</div>;
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><OrganizationSelection identityId="user-a"><Workspace /></OrganizationSelection></QueryClientProvider>);
  return client;
}
async function choose(name: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('combobox', { name: 'Organization' }));
  await user.click(screen.getByRole('option', { name }));
}
function defaultFetch(input: RequestInfo | URL, init?: RequestInit) {
  const id = new Headers(init?.headers).get('X-Organization-Id')!;
  if (String(input).endsWith('/organizations')) return Promise.resolve(response(orgs));
  if (String(input).endsWith('/auth/context')) return Promise.resolve(context(id));
  return Promise.resolve(response({ label: `data-${id}` }));
}
beforeEach(() => {
  identity = { isLoaded: true, isSignedIn: true, userId: 'user-a', sessionId: 'session-a', getToken: async () => 'token-a' };
  fetchMock.mockReset().mockImplementation(defaultFetch);
  global.fetch = fetchMock;
});

it('shows discovery loading and empty states without requesting tenant data', async () => {
  let resolve!: (value: Response) => void;
  fetchMock.mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
  setup();
  expect(screen.getByText('Loading your organizations…')).toBeInTheDocument();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await act(async () => resolve(response([])));
  expect(await screen.findByText('You do not belong to an organization yet.')).toBeInTheDocument();
  expect(screen.queryByText(/Workspace Alpha/)).not.toBeInTheDocument();
  expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('X-Organization-Id')).toBe(false);
});

it.each([404, 500])('shows a discovery error for %s and allows retry', async (status) => {
  fetchMock.mockResolvedValueOnce(response({}, status));
  setup();
  expect(await screen.findByText(status === 404 ? 'Your account is not yet provisioned in TechOps Hub.' : 'Unable to load your organizations.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('combobox', { name: 'Organization' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('requires selection, verifies membership, sends tenant headers, and discards old cache when switching', async () => {
  const client = setup();
  await screen.findByRole('combobox', { name: 'Organization' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await choose('Alpha (alpha)');
  expect(await screen.findByText('Workspace Alpha: data-org-a')).toBeInTheDocument();
  const contextCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/context'))!;
  expect(new Headers(contextCall[1]?.headers).get('X-Organization-Id')).toBe('org-a');
  expect(new Headers(contextCall[1]?.headers).get('Authorization')).toBe('Bearer token-a');
  await choose('Beta (beta)');
  expect(await screen.findByText('Workspace Beta: data-org-b')).toBeInTheDocument();
  expect(screen.queryByText(/data-org-a/)).not.toBeInTheDocument();
  expect(client.getQueryData(tenantQueryKey('user-a', 'org-a', 'example'))).toBeUndefined();
});

it.each([401, 403, 404, 500])('gates the workspace when verification returns %s and supports retry', async (status) => {
  fetchMock.mockImplementation((input, init) => String(input).endsWith('/auth/context') ? Promise.resolve(response({}, status)) : defaultFetch(input, init));
  setup();
  await choose('Alpha (alpha)');
  expect(await screen.findByText(/Organization access could not be verified/)).toBeInTheDocument();
  expect(screen.queryByText(/Workspace Alpha/)).not.toBeInTheDocument();
  fetchMock.mockImplementation(defaultFetch);
  await userEvent.click(screen.getByRole('button', { name: 'Retry access' }));
  expect(await screen.findByText('Workspace Alpha: data-org-a')).toBeInTheDocument();
});

it('rejects mismatched context and ignores a late verification after a rapid switch', async () => {
  let resolve!: (value: Response) => void;
  let oldSignal: AbortSignal | null | undefined;
  fetchMock.mockImplementation((input, init) => {
    if (String(input).endsWith('/auth/context') && new Headers(init?.headers).get('X-Organization-Id') === 'org-a') {
      oldSignal = init?.signal;
      return new Promise<Response>((done) => { resolve = done; });
    }
    return defaultFetch(input, init);
  });
  setup();
  await choose('Alpha (alpha)');
  expect(await screen.findByText('Verifying organization access…')).toBeInTheDocument();
  await choose('Beta (beta)');
  expect(await screen.findByText('Workspace Beta: data-org-b')).toBeInTheDocument();
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => resolve(context('org-a')));
  expect(screen.queryByText(/Workspace Alpha/)).not.toBeInTheDocument();
  fetchMock.mockImplementation((input, init) => String(input).endsWith('/auth/context') ? Promise.resolve(context('org-b')) : defaultFetch(input, init));
  await choose('Alpha (alpha)');
  expect(await screen.findByText('The API returned an invalid organization context.')).toBeInTheDocument();
  expect(screen.queryByText(/Workspace Alpha/)).not.toBeInTheDocument();
});

it('revokes active selection and clears tenant data on a tenant authorization failure', async () => {
  fetchMock.mockImplementation((input, init) => String(input).endsWith('/tenant-example') ? Promise.resolve(response({}, 403)) : defaultFetch(input, init));
  const client = setup();
  await choose('Alpha (alpha)');
  await waitFor(() => expect(screen.queryByText(/Active organization:/)).not.toBeInTheDocument());
  expect(screen.queryByText(/Workspace Alpha/)).not.toBeInTheDocument();
  expect(client.getQueriesData({ queryKey: ['tenant'] }).filter(([, data]) => data !== undefined)).toEqual([]);
});

it('ignores a late tenant result after switching and refreshing can remove a revoked membership', async () => {
  let resolve!: (value: Response) => void;
  let oldSignal: AbortSignal | null | undefined;
  fetchMock.mockImplementation((input, init) => {
    if (String(input).endsWith('/tenant-example') && new Headers(init?.headers).get('X-Organization-Id') === 'org-a') {
      oldSignal = init?.signal;
      return new Promise<Response>((done) => { resolve = done; });
    }
    return defaultFetch(input, init);
  });
  const client = setup();
  await choose('Alpha (alpha)');
  await screen.findByText('Workspace Alpha: loading');
  await choose('Beta (beta)');
  await screen.findByText('Workspace Beta: data-org-b');
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => resolve(response({ label: 'late-alpha' })));
  expect(screen.queryByText(/late-alpha/)).not.toBeInTheDocument();
  expect(client.getQueriesData({ queryKey: tenantQueryKey('user-a', 'org-a') })).toEqual([]);
  fetchMock.mockImplementation((input, init) => String(input).endsWith('/organizations') ? Promise.resolve(response([])) : defaultFetch(input, init));
  await userEvent.click(screen.getByRole('button', { name: 'Refresh organizations' }));
  await screen.findByText('You do not belong to an organization yet.');
  expect(screen.queryByText(/Workspace Beta/)).not.toBeInTheDocument();
});

it('disposes protected caches on identity/session changes and sign-out', async () => {
  const tree = () => <MemoryRouter><AuthConfigurationContext.Provider value="pk_test_fake"><AuthGate><Workspace /></AuthGate></AuthConfigurationContext.Provider></MemoryRouter>;
  const view = render(tree());
  await choose('Alpha (alpha)');
  await screen.findByText('Workspace Alpha: data-org-a');
  const previous = workspaceClient;
  identity = { ...identity, userId: 'user-b', sessionId: 'session-b', getToken: async () => 'token-b' };
  view.rerender(tree());
  await screen.findByRole('combobox', { name: 'Organization' });
  expect(previous.getQueryCache().getAll()).toEqual([]);
  expect(screen.queryByText(/Workspace Alpha/)).not.toBeInTheDocument();
  await choose('Beta (beta)');
  await screen.findByText('Workspace Beta: data-org-b');
  const second = workspaceClient;
  identity = { ...identity, sessionId: 'session-new' };
  view.rerender(tree());
  await screen.findByRole('combobox', { name: 'Organization' });
  expect(second.getQueryCache().getAll()).toEqual([]);
  await choose('Alpha (alpha)');
  await screen.findByText('Workspace Alpha: data-org-a');
  const third = workspaceClient;
  identity = { ...identity, isSignedIn: false };
  view.rerender(tree());
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(third.getQueryCache().getAll()).toEqual([]);
  expect(screen.queryByText(/Workspace Alpha/)).not.toBeInTheDocument();
});

it('discovers and verifies an organization under the application Strict Mode lifecycle', async () => {
  render(<StrictMode><MemoryRouter><AuthConfigurationContext.Provider value="pk_test_fake"><AuthGate><Workspace /></AuthGate></AuthConfigurationContext.Provider></MemoryRouter></StrictMode>);
  await choose('Alpha (alpha)');
  expect(await screen.findByText('Workspace Alpha: data-org-a')).toBeInTheDocument();
});

it('ignores a late denial from a canceled request even after selecting the same organization again', async () => {
  let resolve!: (value: Response) => void;
  let delayed = false;
  fetchMock.mockImplementation((input, init) => {
    if (!delayed && String(input).endsWith('/tenant-example') && new Headers(init?.headers).get('X-Organization-Id') === 'org-a') {
      delayed = true;
      return new Promise<Response>((done) => { resolve = done; });
    }
    return defaultFetch(input, init);
  });
  setup();
  await choose('Alpha (alpha)');
  await screen.findByText('Workspace Alpha: loading');
  await choose('Beta (beta)');
  await screen.findByText('Workspace Beta: data-org-b');
  await choose('Alpha (alpha)');
  await screen.findByText('Workspace Alpha: data-org-a');
  await act(async () => resolve(response({}, 403)));
  expect(screen.getByText('Workspace Alpha: data-org-a')).toBeInTheDocument();
});
