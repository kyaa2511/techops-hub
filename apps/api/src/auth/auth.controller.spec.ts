import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthModule } from './auth.module';

describe('AuthController', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('returns the authenticated Clerk user ID', () => {
    expect(new AuthController().getSession({ authenticatedIdentity: { clerkUserId: 'user_123' } })).toEqual({
      authenticated: true,
      clerkUserId: 'user_123',
    });
  });

  it('does not produce an authenticated response without a guarded identity', () => {
    expect(() => {
      const result = new AuthController().getSession({});
      if (!result.clerkUserId) {
        throw new UnauthorizedException();
      }
    }).toThrow(UnauthorizedException);
  });

  it('returns 401 for an unauthenticated request and the verified ID for an authenticated request', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use((requestWithAuth: Request, _response: Response, next: NextFunction) => {
      if (requestWithAuth.headers.authorization) {
        Object.assign(requestWithAuth, { auth: () => ({ userId: 'user_123' }) });
      }
      next();
    });
    await app.init();

    await request(app.getHttpServer()).get('/auth/session').expect(401);
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect({ authenticated: true, clerkUserId: 'user_123' });
  });
});
