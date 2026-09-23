import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Membership } from '../memberships/membership.entity';
import type { MembershipsService } from '../memberships/memberships.service';
import type { Organization } from '../organizations/organization.entity';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { User } from '../users/user.entity';
import type { UsersService } from '../users/users.service';
import { TenantContextGuard } from './tenant-context.guard';
import type { TenantRequest } from './tenant-context';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  clerkUserId: 'user_123',
} as User;
const organization = {
  id: '22222222-2222-4222-8222-222222222222',
} as Organization;
const membership = {
  id: '33333333-3333-4333-8333-333333333333',
  userId: user.id,
  organizationId: organization.id,
} as Membership;

function createContext(request: TenantRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

function createGuard() {
  const usersService = {
    findByClerkUserId: jest.fn<UsersService['findByClerkUserId']>(),
  };
  const organizationsService = {
    findById: jest.fn<OrganizationsService['findById']>(),
  };
  const membershipsService = {
    findByUserAndOrganization:
      jest.fn<MembershipsService['findByUserAndOrganization']>(),
  };

  return {
    guard: new TenantContextGuard(
      usersService,
      organizationsService,
      membershipsService,
    ),
    usersService,
    organizationsService,
    membershipsService,
  };
}

describe('TenantContextGuard', () => {
  it('resolves the authenticated user, organization, and membership', async () => {
    const { guard, usersService, organizationsService, membershipsService } =
      createGuard();
    usersService.findByClerkUserId.mockResolvedValue(user);
    organizationsService.findById.mockResolvedValue(organization);
    membershipsService.findByUserAndOrganization.mockResolvedValue(membership);
    const request: TenantRequest = {
      authenticatedIdentity: { clerkUserId: user.clerkUserId },
      headers: { 'x-organization-id': organization.id },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.authenticatedUser).toBe(user);
    expect(request.tenantContext).toEqual({
      user,
      organization,
      membership,
    });
    expect(membershipsService.findByUserAndOrganization).toHaveBeenCalledWith(
      user.id,
      organization.id,
    );
  });

  it('rejects a request without an active organization', async () => {
    const { guard } = createGuard();
    const request: TenantRequest = {
      authenticatedIdentity: { clerkUserId: user.clerkUserId },
      headers: {},
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid active organization ID', async () => {
    const { guard } = createGuard();
    const request: TenantRequest = {
      authenticatedIdentity: { clerkUserId: user.clerkUserId },
      headers: { 'x-organization-id': 'not-a-uuid' },
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a nonexistent organization', async () => {
    const { guard, usersService, organizationsService } = createGuard();
    usersService.findByClerkUserId.mockResolvedValue(user);
    organizationsService.findById.mockResolvedValue(null);
    const request: TenantRequest = {
      authenticatedIdentity: { clerkUserId: user.clerkUserId },
      headers: { 'x-organization-id': organization.id },
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a user without membership in the active organization', async () => {
    const { guard, usersService, organizationsService, membershipsService } =
      createGuard();
    usersService.findByClerkUserId.mockResolvedValue(user);
    organizationsService.findById.mockResolvedValue(organization);
    membershipsService.findByUserAndOrganization.mockResolvedValue(null);
    const request: TenantRequest = {
      authenticatedIdentity: { clerkUserId: user.clerkUserId },
      headers: { 'x-organization-id': organization.id },
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
