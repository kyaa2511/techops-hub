import { createContext, useContext } from 'react';

export interface VerifiedOrganization {
  organizationId: string;
  name: string;
  slug: string;
  membershipId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface OrganizationScope {
  identityId: string;
  organization: VerifiedOrganization;
  revoke: () => void;
}

export const OrganizationContext = createContext<OrganizationScope | null>(null);

export function useOrganization() {
  const scope = useContext(OrganizationContext);
  if (!scope) throw new Error('A verified organization is required.');
  return scope;
}

export function tenantQueryKey(identityId: string, organizationId: string, ...parts: readonly unknown[]) {
  return ['tenant', identityId, organizationId, ...parts] as const;
}
