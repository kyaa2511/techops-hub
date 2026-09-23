import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Request } from 'express';
import request from 'supertest';
import type { getAuth } from '@clerk/express';
import type { User } from '../users/user.entity';
import type { UsersService as UsersServiceType } from '../users/users.service';

const getAuthMock = jest.fn<typeof getAuth>();

jest.unstable_mockModule('@clerk/express', () => ({
  getAuth: getAuthMock,
}));

let AuthController: (typeof import('./auth.controller'))['AuthController'];
let ClerkAuthGuard: (typeof import('./clerk-auth.guard'))['ClerkAuthGuard'];
let UsersService: (typeof import('../users/users.service'))['UsersService'];

beforeAll(async () => {
  ({ AuthController } = await import('./auth.controller'));
  ({ ClerkAuthGuard } = await import('./clerk-auth.guard'));
  ({ UsersService } = await import('../users/users.service'));
});

describe('AuthController', () => {
  let app: INestApplication;
  const usersService = {
    findByClerkUserId: jest.fn<UsersServiceType['findByClerkUserId']>(),
  };

  beforeEach(() => {
    getAuthMock.mockReset();
    usersService.findByClerkUserId.mockReset();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('resolves and returns the local user for a verified Clerk identity', async () => {
    usersService.findByClerkUserId.mockResolvedValue({
      id: 'local-user-id',
      clerkUserId: 'user_123',
    } as User);

    const controller = new AuthController(usersService);

    await expect(
      controller.getSession({
        authenticatedIdentity: { clerkUserId: 'user_123' },
      }),
    ).resolves.toEqual({
      authenticated: true,
      clerkUserId: 'user_123',
      userId: 'local-user-id',
    });
    expect(usersService.findByClerkUserId).toHaveBeenCalledWith('user_123');
  });

  it('rejects an authenticated Clerk identity without a local user', async () => {
    usersService.findByClerkUserId.mockRejectedValue(new Error('not found'));

    await expect(
      new AuthController(usersService).getSession({
        authenticatedIdentity: { clerkUserId: 'user_123' },
      }),
    ).rejects.toThrow('not found');
  });

  it('uses the verified request identity instead of a client-supplied ID', async () => {
    getAuthMock.mockImplementation((incomingRequest: Request) => {
      const userId = incomingRequest.headers.authorization
        ? 'verified_user'
        : null;
      return { userId } as ReturnType<typeof getAuth>;
    });
    usersService.findByClerkUserId.mockResolvedValue({
      id: 'local-user-id',
      clerkUserId: 'verified_user',
    } as User);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ClerkAuthGuard,
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .get('/auth/session?clerkUserId=attacker_user')
      .set('Authorization', 'verified')
      .set('x-clerk-user-id', 'attacker_user')
      .expect(200)
      .expect({
        authenticated: true,
        clerkUserId: 'verified_user',
        userId: 'local-user-id',
      });

    expect(usersService.findByClerkUserId).toHaveBeenCalledWith(
      'verified_user',
    );
    expect(usersService.findByClerkUserId).not.toHaveBeenCalledWith(
      'attacker_user',
    );
  });

  it('returns 401 for an unauthenticated request', async () => {
    getAuthMock.mockReturnValue({ userId: null } as ReturnType<typeof getAuth>);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ClerkAuthGuard,
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/auth/session').expect(401);
    expect(usersService.findByClerkUserId).not.toHaveBeenCalled();
  });
});
