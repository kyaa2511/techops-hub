import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { getAuth } from '@clerk/express';
import type { Request } from 'express';
import { AuthenticatedRequest } from './authenticated-identity';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & AuthenticatedRequest>();

    let auth: ReturnType<typeof getAuth> | undefined;
    try {
      // getAuth() throws if clerkMiddleware() has not populated verified auth state on the request.
      auth = getAuth(request);
    } catch {
      throw new UnauthorizedException();
    }

    if (!auth.userId) {
      throw new UnauthorizedException();
    }

    request.authenticatedIdentity = { clerkUserId: auth.userId };
    return true;
  }
}
