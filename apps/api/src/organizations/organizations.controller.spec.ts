import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Request } from 'express';
import request from 'supertest';
import type { getAuth } from '@clerk/express';
import type { Membership } from '../memberships/membership.entity';
import { MembershipRole } from '../memberships/membership-role.enum';
import type { Organization } from './organization.entity';
import type { OrganizationsService as OrganizationsServiceType } from './organizations.service';

const getAuthMock = jest.fn<typeof getAuth>();

jest.unstable_mockModule('@clerk/express', () => ({
  getAuth: getAuthMock,
}));

jest.setTimeout(15000);

let ClerkAuthGuard: (typeof import('../auth/clerk-auth.guard'))['ClerkAuthGuard'];
let OrganizationsController: (typeof import('./organizations.controller'))['OrganizationsController'];
let OrganizationsService: (typeof import('./organizations.service'))['OrganizationsService'];

beforeAll(async () => {
  ({ ClerkAuthGuard } = await import('../auth/clerk-auth.guard'));
  ({ OrganizationsController } = await import('./organizations.controller'));
  ({ OrganizationsService } = await import('./organizations.service'));
});

describe('OrganizationsController', () => {
  let app: INestApplication;
  const organizationsService = {
    createForClerkUser:
      jest.fn<OrganizationsServiceType['createForClerkUser']>(),
  };

  beforeEach(() => {
    getAuthMock.mockReset();
    organizationsService.createForClerkUser.mockReset();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('creates an organization for the verified Clerk identity', async () => {
    getAuthMock.mockImplementation((incomingRequest: Request) => {
      const userId = incomingRequest.headers.authorization
        ? 'verified_user'
        : null;
      return { userId } as ReturnType<typeof getAuth>;
    });
    organizationsService.createForClerkUser.mockResolvedValue({
      organization: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Katana Tech',
        slug: 'katana-tech',
      } as Organization,
      ownerMembership: {
        id: '44444444-4444-4444-8444-444444444444',
        role: MembershipRole.OWNER,
      } as Membership,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        ClerkAuthGuard,
        {
          provide: OrganizationsService,
          useValue: organizationsService,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/organizations?clerkUserId=attacker_user')
      .send({ name: 'Katana Tech', slug: 'katana-tech' })
      .set('Authorization', 'verified')
      .set('x-clerk-user-id', 'header_attacker_user')
      .expect(201)
      .expect({
        organizationId: '33333333-3333-4333-8333-333333333333',
        name: 'Katana Tech',
        slug: 'katana-tech',
        ownerMembershipId: '44444444-4444-4444-8444-444444444444',
      });

    expect(organizationsService.createForClerkUser).toHaveBeenCalledWith(
      'verified_user',
      { name: 'Katana Tech', slug: 'katana-tech' },
    );
    expect(organizationsService.createForClerkUser).not.toHaveBeenCalledWith(
      'attacker_user',
      expect.anything(),
    );
  });

  it('rejects unauthenticated organization creation before invoking the service', async () => {
    getAuthMock.mockReturnValue({ userId: null } as ReturnType<typeof getAuth>);

    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        ClerkAuthGuard,
        {
          provide: OrganizationsService,
          useValue: organizationsService,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/organizations')
      .send({ name: 'Katana Tech', slug: 'katana-tech' })
      .expect(401);

    expect(organizationsService.createForClerkUser).not.toHaveBeenCalled();
  });
});
