import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    listForClerkUser: jest.fn<OrganizationsServiceType['listForClerkUser']>(),
    createForClerkUser:
      jest.fn<OrganizationsServiceType['createForClerkUser']>(),
  };

  beforeEach(() => {
    getAuthMock.mockReset();
    organizationsService.listForClerkUser.mockReset();
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    await request(app.getHttpServer())
      .post('/organizations')
      .send({ name: 'Katana Tech', slug: 'katana-tech' })
      .expect(401);

    expect(organizationsService.createForClerkUser).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { name: '', slug: 'valid-slug' },
    { name: 'x'.repeat(121), slug: 'valid-slug' },
    { name: 123, slug: 'valid-slug' },
    { name: 'Valid', slug: 'ab' },
    { name: 'Valid', slug: 'x'.repeat(81) },
    { name: 'Valid', slug: 'Invalid Slug' },
    { name: 'Valid', slug: 'double--hyphen' },
    { name: 'Valid', slug: 'valid-slug', userId: 'attacker' },
    { name: 'Valid', slug: 'valid-slug', role: 'OWNER' },
    { name: 'Valid', slug: 'valid-slug', organizationId: 'other-tenant' },
  ])('rejects invalid onboarding input %j before persistence', async (body) => {
    getAuthMock.mockReturnValue({ userId: 'verified_user' } as ReturnType<
      typeof getAuth
    >);
    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        ClerkAuthGuard,
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    await request(app.getHttpServer())
      .post('/organizations')
      .send(body)
      .expect(400);
    expect(organizationsService.createForClerkUser).not.toHaveBeenCalled();
  });
  it('lists only the verified identity organizations without tenant context', async () => {
    getAuthMock.mockReturnValue({ userId: 'verified_user' } as ReturnType<
      typeof getAuth
    >);
    organizationsService.listForClerkUser.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        ClerkAuthGuard,
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await request(app.getHttpServer())
      .get('/organizations?clerkUserId=attacker')
      .set('x-clerk-user-id', 'attacker')
      .expect(200)
      .expect([]);
    expect(organizationsService.listForClerkUser).toHaveBeenCalledWith(
      'verified_user',
    );
  });

  it('rejects unauthenticated organization discovery', async () => {
    getAuthMock.mockReturnValue({ userId: null } as ReturnType<typeof getAuth>);
    const moduleRef = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        ClerkAuthGuard,
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    await request(app.getHttpServer()).get('/organizations').expect(401);
    expect(organizationsService.listForClerkUser).not.toHaveBeenCalled();
  });
});
