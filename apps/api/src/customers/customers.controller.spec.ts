import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { getAuth } from '@clerk/express';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MembershipRole } from '../memberships/membership-role.enum';

const getAuthMock = jest.fn<typeof getAuth>();
jest.unstable_mockModule('@clerk/express', () => ({ getAuth: getAuthMock }));
let CustomersController: (typeof import('./customers.controller'))['CustomersController'];
let CustomersService: (typeof import('./customers.service'))['CustomersService'];
let Customer: (typeof import('./customer.entity'))['Customer'];
let ClerkAuthGuard: (typeof import('../auth/clerk-auth.guard'))['ClerkAuthGuard'];
let TenantContextGuard: (typeof import('../auth/tenant-context.guard'))['TenantContextGuard'];
let UsersService: (typeof import('../users/users.service'))['UsersService'];
let OrganizationsService: (typeof import('../organizations/organizations.service'))['OrganizationsService'];
let MembershipsService: (typeof import('../memberships/memberships.service'))['MembershipsService'];

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
describe('Customer HTTP authorization and contracts', () => {
  let app: INestApplication;
  let role = MembershipRole.OWNER;
  let member = true;
  const repository = {
    findAndCount: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findOneBy: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(data: unknown) => unknown>((data) => data),
    save: jest.fn<(data: unknown) => Promise<unknown>>(async (data) => ({
      ...(data as object),
      id,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  beforeAll(async () => {
    ({ CustomersController } = await import('./customers.controller'));
    ({ CustomersService } = await import('./customers.service'));
    ({ Customer } = await import('./customer.entity'));
    ({ ClerkAuthGuard } = await import('../auth/clerk-auth.guard'));
    ({ TenantContextGuard } = await import('../auth/tenant-context.guard'));
    ({ UsersService } = await import('../users/users.service'));
    ({ OrganizationsService } =
      await import('../organizations/organizations.service'));
    ({ MembershipsService } =
      await import('../memberships/memberships.service'));
    const module = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        CustomersService,
        ClerkAuthGuard,
        TenantContextGuard,
        { provide: getRepositoryToken(Customer), useValue: repository },
        {
          provide: UsersService,
          useValue: { findByClerkUserId: async () => ({ id: 'user' }) },
        },
        {
          provide: OrganizationsService,
          useValue: {
            findById: async (organizationId: string) => ({
              id: organizationId,
            }),
          },
        },
        {
          provide: MembershipsService,
          useValue: {
            findByUserAndOrganization: async (
              userId: string,
              organizationId: string,
            ) =>
              member && organizationId === a
                ? { userId, organizationId, role }
                : null,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockClear());
    role = MembershipRole.OWNER;
    member = true;
    getAuthMock.mockReturnValue({ userId: 'verified' } as ReturnType<
      typeof getAuth
    >);
    repository.findAndCount.mockResolvedValue([[], 0]);
    repository.findOneBy.mockResolvedValue(null);
    repository.update.mockResolvedValue({ affected: 0 });
  });
  it.each(['get', 'post', 'patch'] as const)(
    'requires authentication for %s',
    async (method) => {
      getAuthMock.mockReturnValue({ userId: null } as ReturnType<
        typeof getAuth
      >);
      await request(app.getHttpServer())
        [method](method === 'patch' ? '/customers/' + id : '/customers')
        .send({ name: 'Valid' })
        .expect(401);
      expect(repository.findAndCount).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it.each(['get', 'post', 'patch'] as const)(
    'denies another tenant and revoked membership for %s',
    async (method) => {
      const path = method === 'patch' ? '/customers/' + id : '/customers';
      await request(app.getHttpServer())
        [method](path)
        .set('X-Organization-Id', b)
        .send({ name: 'Valid' })
        .expect(403);
      member = false;
      await request(app.getHttpServer())
        [method](path)
        .set('X-Organization-Id', a)
        .send({ name: 'Valid' })
        .expect(403);
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.findAndCount).not.toHaveBeenCalled();
    },
  );
  it.each(['get', 'post', 'patch'] as const)(
    'denies MEMBER customer access for %s',
    async (method) => {
      role = MembershipRole.MEMBER;
      await request(app.getHttpServer())
        [method](method === 'patch' ? '/customers/' + id : '/customers')
        .set('X-Organization-Id', a)
        .send({ name: 'Valid' })
        .expect(403);
      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.findAndCount).not.toHaveBeenCalled();
    },
  );
  it.each([MembershipRole.OWNER, MembershipRole.ADMIN])(
    'allows %s and scopes pagination',
    async (selectedRole) => {
      role = selectedRole;
      await request(app.getHttpServer())
        .get('/customers?page=2&limit=10')
        .set('X-Organization-Id', a)
        .expect(200)
        .expect({ items: [], total: 0, page: 2, limit: 10 });
      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: a },
          skip: 10,
          take: 10,
        }),
      );
    },
  );
  it('creates trimmed fields under verified organization', async () => {
    await request(app.getHttpServer())
      .post('/customers')
      .set('X-Organization-Id', a)
      .send({ name: '  Alice  ', notes: null })
      .expect(201);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alice',
        organizationId: a,
        notes: null,
      }),
    );
  });
  it.each([
    {},
    { name: ' ' },
    { name: null },
    { name: 'A', status: null },
    { name: 'A', email: 'bad' },
    { name: 'A', phone: 42 },
    { name: 'A', status: 'LEAD' },
    { name: 'A', organizationId: b },
    { name: 'A', createdAt: 'today' },
    { name: 'A', notes: 'x'.repeat(5001) },
  ])('rejects invalid create input %#', async (body) => {
    await request(app.getHttpServer())
      .post('/customers')
      .set('X-Organization-Id', a)
      .send(body)
      .expect(400);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it.each([
    { name: null },
    { name: ' ' },
    { status: null },
    { organizationId: b },
    { id },
  ])('rejects invalid patch %#', async (body) => {
    await request(app.getHttpServer())
      .patch('/customers/' + id)
      .set('X-Organization-Id', a)
      .send(body)
      .expect(400);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it.each([
    'page=0',
    'page=1.5',
    'limit=101',
    'limit=no',
    'organizationId=' + b,
  ])('rejects query %s', async (query) => {
    await request(app.getHttpServer())
      .get('/customers?' + query)
      .set('X-Organization-Id', a)
      .expect(400);
  });
  it('requires valid tenant header and customer UUID', async () => {
    await request(app.getHttpServer()).get('/customers').expect(400);
    await request(app.getHttpServer())
      .get('/customers')
      .set('X-Organization-Id', 'invalid')
      .expect(400);
    await request(app.getHttpServer())
      .get('/customers/invalid')
      .set('X-Organization-Id', a)
      .expect(400);
  });
  it('returns identical 404 for unknown or foreign customer and scopes updates', async () => {
    await request(app.getHttpServer())
      .get('/customers/' + id)
      .set('X-Organization-Id', a)
      .expect(404);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      id,
      organizationId: a,
    });
    await request(app.getHttpServer())
      .patch('/customers/' + id)
      .set('X-Organization-Id', a)
      .send({ notes: null })
      .expect(404);
    expect(repository.update).toHaveBeenCalledWith(
      { id, organizationId: a },
      { notes: null },
    );
  });
});
