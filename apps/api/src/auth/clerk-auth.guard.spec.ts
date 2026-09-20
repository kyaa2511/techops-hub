import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';

function createContext(request: object): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('ClerkAuthGuard', () => {
  it('rejects unauthenticated requests', () => {
    const request = { auth: () => ({ userId: null }) };

    expect(() => new ClerkAuthGuard().canActivate(createContext(request))).toThrow(UnauthorizedException);
  });

  it('rejects requests when Clerk middleware is not active', () => {
    expect(() => new ClerkAuthGuard().canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('exposes the verified Clerk identity', () => {
    const request: { auth: () => { userId: string }; authenticatedIdentity?: { clerkUserId: string } } = {
      auth: () => ({ userId: 'user_123' }),
    };

    expect(new ClerkAuthGuard().canActivate(createContext(request))).toBe(true);
    expect(request.authenticatedIdentity).toEqual({ clerkUserId: 'user_123' });
  });
});
