import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Request } from 'express';
import request from 'supertest';
import type { getAuth } from '@clerk/express';

const getAuthMock = jest.fn<typeof getAuth>();

jest.unstable_mockModule('@clerk/express', () => ({
  getAuth: getAuthMock,
}));

let AuthController: (typeof import('./auth.controller'))['AuthController'];
let AuthModule: (typeof import('./auth.module'))['AuthModule'];

beforeAll(async () => {
  ({ AuthController } = await import('./auth.controller'));
  ({ AuthModule } = await import('./auth.module'));
});

describe('AuthController', () => {
  let app: INestApplication;

  beforeEach(() => {
    getAuthMock.mockReset();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('returns the authenticated Clerk user ID for a request carrying a verified identity', () => {
    expect(new AuthController().getSession({ authenticatedIdentity: { clerkUserId: 'user_123' } })).toEqual({
      authenticated: true,
      clerkUserId: 'user_123',
    });
  });

  it('returns 401 for an unauthenticated request and the verified clerkUserId once authenticated', async () => {
    getAuthMock.mockImplementation((incomingRequest: Request) => {
      const userId = incomingRequest.headers.authorization ? 'user_123' : null;
      return { userId } as ReturnType<typeof getAuth>;
    });

    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/auth/session').expect(401);
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', 'Bearer test-session-token')
      .expect(200)
      .expect({ authenticated: true, clerkUserId: 'user_123' });
  });
});
