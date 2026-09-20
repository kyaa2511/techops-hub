import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ExpressRequestWithAuth } from '@clerk/express';
import { AuthenticatedRequest } from './authenticated-identity';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ExpressRequestWithAuth & AuthenticatedRequest>();
    const auth = typeof request.auth === 'function' ? request.auth() : undefined;
    const userId = auth?.userId;

    if (!userId) {
      throw new UnauthorizedException();
    }

    request.authenticatedIdentity = { clerkUserId: userId };
    return true;
  }
}
