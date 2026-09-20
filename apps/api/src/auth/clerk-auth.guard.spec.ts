import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import type { getAuth } from '@clerk/express';

const getAuthMock = jest.fn<typeof getAuth>();

jest.unstable_mockModule('@clerk/express', () => ({
  getAuth: getAuthMock,
}));

let ClerkAuthGuard: (typeof import('./clerk-auth.guard'))['ClerkAuthGuard'];

beforeAll(async () => {
  ({ ClerkAuthGuard } = await import('./clerk-auth.guard'));
});

function createContext(request: object): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('ClerkAuthGuard', () => {
  beforeEach(() => {
    getAuthMock.mockReset();
  });

  it('rejects an unauthenticated Clerk session', () => {
    getAuthMock.mockReturnValue({ userId: null } as ReturnType<typeof getAuth>);

    expect(() => new ClerkAuthGuard().canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('rejects requests when Clerk middleware has not populated auth state', () => {
    getAuthMock.mockImplementation(() => {
      throw new Error('clerkMiddleware() was not run before getAuth() was called.');
    });

    expect(() => new ClerkAuthGuard().canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('allows a verified Clerk session and exposes the authenticated identity', () => {
    getAuthMock.mockReturnValue({ userId: 'user_123' } as ReturnType<typeof getAuth>);
    const request: { authenticatedIdentity?: { clerkUserId: string } } = {};

    expect(new ClerkAuthGuard().canActivate(createContext(request))).toBe(true);
    expect(request.authenticatedIdentity).toEqual({ clerkUserId: 'user_123' });
  });
});
