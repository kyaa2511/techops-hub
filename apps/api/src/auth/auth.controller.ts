import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from './authenticated-identity';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Controller('auth')
export class AuthController {
  @Get('session')
  @UseGuards(ClerkAuthGuard)
  getSession(@Req() request: AuthenticatedRequest) {
    return {
      authenticated: true,
      clerkUserId: request.authenticatedIdentity?.clerkUserId,
    };
  }
}
