import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationSelection } from './organization-selection.tsx';

/** Remounted by AuthGate for every Clerk identity/session change. */
export function AuthenticatedWorkspace({ identityId, children }: { identityId: string; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  }));

  useEffect(() => () => {
    void client.cancelQueries();
    client.clear();
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <OrganizationSelection identityId={identityId}>{children}</OrganizationSelection>
    </QueryClientProvider>
  );
}
