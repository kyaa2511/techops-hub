import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { getAuth } from '@clerk/express';
import type { Request } from 'express';
import request from 'supertest';
import type { Membership } from '../memberships/membership.entity';
import type { MembershipsService as MembershipsServiceType } from '../memberships/memberships.service';
import type { Organization } from '../organizations/organization.entity';
import type { OrganizationsService as OrganizationsServiceType } from '../organizations/organizations.service';
import type { User } from '../users/user.entity';
import type { UsersService as UsersServiceType } from '../users/users.service';
import { MembershipRole } from '../memberships/membership-role.enum';

const getAuthMock = jest.fn<typeof getAuth>();

jest.unstable_mockModule('@clerk/express', () => ({ getAuth: getAuthMock }));

let AuthController: (typeof import('./auth.controller'))['AuthController'];
let ClerkAuthGuard: (typeof import('./clerk-auth.guard'))['ClerkAuthGuard'];
let TenantContextGuard: (typeof import('./tenant-context.guard'))['TenantContextGuard'];
let UsersService: (typeof import('../users/users.service'))['UsersService'];
let OrganizationsService: (typeof import('../organizations/organizations.service'))['OrganizationsService'];
let MembershipsService: (typeof import('../memberships/memberships.service'))['MembershipsService'];

const userA = {
  id: '11111111-1111-4111-8111-111111111111',
  clerkUserId: 'clerk_a',
} as User;
const userB = {
  id: '22222222-2222-4222-8222-222222222222',
  clerkUserId: 'clerk_b',
} as User;
const orgA = { id: '33333333-3333-4333-8333-333333333333' } as Organization;
const orgB = { id: '44444444-4444-4444-8444-444444444444' } as Organization;
const membershipA = {
  id: '55555555-5555-4555-8555-555555555555',
  userId: userA.id,
  organizationId: orgA.id,
  role: MembershipRole.OWNER,
} as Membership;
const membershipB = {
  id: '66666666-6666-4666-8666-666666666666',
  userId: userB.id,
  organizationId: orgB.id,
  role: MembershipRole.MEMBER,
} as Membership;

beforeAll(async () => {
  ({ AuthController } = await import('./auth.controller'));
  ({ ClerkAuthGuard } = await import('./clerk-auth.guard'));
  ({ TenantContextGuard } = await import('./tenant-context.guard'));
  ({ UsersService } = await import('../users/users.service'));
  ({ OrganizationsService } =
    await import('../organizations/organizations.service'));
  ({ MembershipsService } = await import('../memberships/memberships.service'));
});

describe('tenant authorization over HTTP', () => {
  let app: INestApplication;
  const usersService = {
    findByClerkUserId: jest.fn<UsersServiceType['findByClerkUserId']>(),
  };
  const organizationsService = {
    findById: jest.fn<OrganizationsServiceType['findById']>(),
  };
  const membershipsService = {
    findByUserAndOrganization:
      jest.fn<MembershipsServiceType['findByUserAndOrganization']>(),
  };

  beforeEach(async () => {
    getAuthMock.mockReset();
    usersService.findByClerkUserId.mockReset();
    organizationsService.findById.mockReset();
    membershipsService.findByUserAndOrganization.mockReset();

    // This test replaces Clerk's verified session with a controlled identity.
    getAuthMock.mockImplementation((incomingRequest: Request) => {
      const token = incomingRequest.headers.authorization;
      const userId =
        token === 'Bearer user-a'
          ? userA.clerkUserId
          : token === 'Bearer user-b'
            ? userB.clerkUserId
            : null;
      return { userId } as ReturnType<typeof getAuth>;
    });
    usersService.findByClerkUserId.mockImplementation(async (clerkUserId) => {
      const user = [userA, userB].find(
        (item) => item.clerkUserId === clerkUserId,
      );
      if (!user) throw new Error('Unexpected Clerk user in test');
      return user;
    });
    organizationsService.findById.mockImplementation(
      async (id) => [orgA, orgB].find((item) => item.id === id) ?? null,
    );
    membershipsService.findByUserAndOrganization.mockImplementation(
      async (userId, organizationId) =>
        [membershipA, membershipB].find(
          (item) =>
            item.userId === userId && item.organizationId === organizationId,
        ) ?? null,
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ClerkAuthGuard,
        TenantContextGuard,
        { provide: UsersService, useValue: usersService },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: MembershipsService, useValue: membershipsService },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows a member into their organization and returns only their verified context', async () => {
    await request(app.getHttpServer())
      .get('/auth/context?userId=attacker&organizationId=' + orgB.id)
      .set('Authorization', 'Bearer user-a')
      .set('X-Clerk-User-Id', userB.clerkUserId)
      .set('X-Organization-Id', orgA.id)
      .expect(200)
      .expect({
        authenticated: true,
        userId: userA.id,
        organizationId: orgA.id,
        membershipId: membershipA.id,
        role: MembershipRole.OWNER,
      });
    expect(membershipsService.findByUserAndOrganization).toHaveBeenCalledWith(
      userA.id,
      orgA.id,
    );
  });

  it('forbids a user from selecting another organization without membership', async () => {
    await request(app.getHttpServer())
      .get('/auth/context')
      .set('Authorization', 'Bearer user-a')
      .set('X-Organization-Id', orgB.id)
      .expect(403);
    expect(membershipsService.findByUserAndOrganization).toHaveBeenCalledWith(
      userA.id,
      orgB.id,
    );
  });

  it('allows a different member into that organization with their own context', async () => {
    await request(app.getHttpServer())
      .get('/auth/context')
      .set('Authorization', 'Bearer user-b')
      .set('X-Organization-Id', orgB.id)
      .expect(200)
      .expect({
        authenticated: true,
        userId: userB.id,
        organizationId: orgB.id,
        membershipId: membershipB.id,
        role: MembershipRole.MEMBER,
      });
  });

  it('rejects unauthenticated requests before resolving local or tenant data', async () => {
    await request(app.getHttpServer())
      .get('/auth/context')
      .set('X-Clerk-User-Id', userA.clerkUserId)
      .set('X-Organization-Id', orgA.id)
      .expect(401);
    expect(usersService.findByClerkUserId).not.toHaveBeenCalled();
    expect(organizationsService.findById).not.toHaveBeenCalled();
    expect(membershipsService.findByUserAndOrganization).not.toHaveBeenCalled();
  });

  it('rejects invalid context headers before looking up tenant data', async () => {
    await request(app.getHttpServer())
      .get('/auth/context')
      .set('Authorization', 'Bearer user-a')
      .expect(400);
    await request(app.getHttpServer())
      .get('/auth/context')
      .set('Authorization', 'Bearer user-a')
      .set('X-Organization-Id', 'not-a-uuid')
      .expect(400);
    expect(organizationsService.findById).not.toHaveBeenCalled();
    expect(membershipsService.findByUserAndOrganization).not.toHaveBeenCalled();
  });

  it('returns 404 for an organization that does not exist', async () => {
    await request(app.getHttpServer())
      .get('/auth/context')
      .set('Authorization', 'Bearer user-a')
      .set('X-Organization-Id', '77777777-7777-4777-8777-777777777777')
      .expect(404);
    expect(membershipsService.findByUserAndOrganization).not.toHaveBeenCalled();
  });

  it('keeps the session endpoint independent of organization selection', async () => {
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', 'Bearer user-a')
      .expect(200)
      .expect({
        authenticated: true,
        clerkUserId: userA.clerkUserId,
        userId: userA.id,
      });
    expect(organizationsService.findById).not.toHaveBeenCalled();
    expect(membershipsService.findByUserAndOrganization).not.toHaveBeenCalled();
  });
});
