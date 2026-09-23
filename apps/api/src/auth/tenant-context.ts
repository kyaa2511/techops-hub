import type { IncomingHttpHeaders } from 'node:http';
import type { Membership } from '../memberships/membership.entity';
import type { Organization } from '../organizations/organization.entity';
import type { User } from '../users/user.entity';
import type { AuthenticatedRequest } from './authenticated-identity';

export interface TenantContext {
  user: User;
  organization: Organization;
  membership: Membership;
}

export interface TenantRequest extends AuthenticatedRequest {
  headers: IncomingHttpHeaders;
  authenticatedUser?: User;
  tenantContext?: TenantContext;
}
