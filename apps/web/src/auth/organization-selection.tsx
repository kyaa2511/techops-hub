import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createAuthenticatedApiClient, useAuthenticatedApi } from '../shared/api/authenticated-api.ts';
import { useAuth } from '@clerk/react';
import { OrganizationContext, tenantQueryKey } from './organization-context.ts';
import type { VerifiedOrganization } from './organization-context.ts';

interface TenantResponse {
  authenticated: boolean;
  userId: string;
  organizationId: string;
  membershipId: string;
  role: VerifiedOrganization['role'];
}

export function OrganizationSelection({ identityId, children }: { identityId: string; children: ReactNode }) {
  const api = useAuthenticatedApi();
  const { getToken } = useAuth();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [accessRevoked, setAccessRevoked] = useState(false);
  const organizations = useQuery({
    queryKey: ['identity', identityId, 'organizations'],
    queryFn: async ({ signal }): Promise<VerifiedOrganization[]> => {
      const response = await api('/api/v1/organizations', { signal });
      if (!response.ok) throw new Error(response.status === 404
        ? 'Your account is not yet provisioned in TechOps Hub.'
        : 'Unable to load your organizations.');
      return response.json() as Promise<VerifiedOrganization[]>;
    },
    retry: false,
  });
  const selected = organizations.data?.find((organization) => organization.organizationId === selectedId);
  const verification = useQuery({
    queryKey: tenantQueryKey(identityId, selectedId, 'context'),
    enabled: !!selected,
    retry: false,
    queryFn: async ({ signal }): Promise<TenantResponse> => {
      const response = await createAuthenticatedApiClient(getToken, selectedId)('/api/v1/auth/context', { signal });
      if (!response.ok) throw new Error('Organization access could not be verified. Select an organization or retry.');
      const context = await response.json() as TenantResponse;
      if (!context.authenticated || context.organizationId !== selectedId || !context.userId || !context.membershipId
        || !['OWNER', 'ADMIN', 'MEMBER'].includes(context.role)) {
        throw new Error('The API returned an invalid organization context.');
      }
      return context;
    },
  });

  const clearTenantQueries = useCallback(() => {
    void client.cancelQueries({ queryKey: ['tenant'] });
    client.removeQueries({ queryKey: ['tenant'] });
  }, [client]);
  const select = (id: string) => {
    setAccessRevoked(false);
    clearTenantQueries();
    setSelectedId(id);
  };
  const revoke = useCallback(() => {
    // A late failure from the old organization must not clear a newer selection.
    setSelectedId((current) => current === selectedId ? '' : current);
    setAccessRevoked(true);
    void client.cancelQueries({ queryKey: tenantQueryKey(identityId, selectedId) });
    client.removeQueries({ queryKey: tenantQueryKey(identityId, selectedId) });
    void client.invalidateQueries({ queryKey: ['identity', identityId, 'organizations'] });
  }, [client, identityId, selectedId]);

  return (
    <>
      <Box sx={{ maxWidth: 720, mx: 'auto', px: 3, py: 2 }}>
        <Stack gap={2}>
          <Typography component="h2" variant="h6">Organization workspace</Typography>
          {accessRevoked && !selectedId ? <Alert severity="warning">Organization access was denied. Refresh or select an organization to verify access again.</Alert> : null}
          {organizations.isPending ? <Alert severity="info">Loading your organizations…</Alert> : null}
          {organizations.isError ? <Alert severity="error" action={<Button color="inherit" onClick={() => void organizations.refetch()}>Retry</Button>}>{organizations.error.message}</Alert> : null}
          {organizations.isSuccess && organizations.data.length === 0 ? <Alert severity="info">You do not belong to an organization yet.</Alert> : null}
          {organizations.isSuccess && organizations.data.length > 0 ? (
            <TextField select label="Organization" value={selected?.organizationId ?? ''} onChange={(event) => select(event.target.value)} fullWidth>
              <MenuItem value="" disabled>Select an organization</MenuItem>
              {organizations.data.map((organization) => <MenuItem key={organization.organizationId} value={organization.organizationId}>{organization.name} ({organization.slug})</MenuItem>)}
            </TextField>
          ) : null}
          {organizations.isSuccess ? <Button onClick={() => { select(''); void organizations.refetch(); }} disabled={organizations.isFetching}>Refresh organizations</Button> : null}
          {selected && verification.isPending ? <Alert severity="info">Verifying organization access…</Alert> : null}
          {selected && verification.isError ? <Alert severity="error" action={<Button color="inherit" onClick={() => void verification.refetch()}>Retry access</Button>}>{verification.error.message}</Alert> : null}
          {selected && verification.isSuccess ? <Alert severity="success">Active organization: {selected.name}. Role: {verification.data.role}.</Alert> : null}
        </Stack>
      </Box>
      {selected && verification.isSuccess && !verification.isFetching ? (
        <OrganizationContext.Provider value={{ identityId, organization: { ...selected, membershipId: verification.data.membershipId, role: verification.data.role }, revoke }}>
          <div key={selectedId}>{children}</div>
        </OrganizationContext.Provider>
      ) : null}
    </>
  );
}
