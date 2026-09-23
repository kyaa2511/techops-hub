import {
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthenticatedRequest } from './authenticated-identity';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: Pick<UsersService, 'findByClerkUserId'>,
  ) {}

  @Get('session')
  @UseGuards(ClerkAuthGuard)
  async getSession(@Req() request: AuthenticatedRequest) {
    const clerkUserId = request.authenticatedIdentity?.clerkUserId;

    if (!clerkUserId) {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findByClerkUserId(clerkUserId);

    return {
      authenticated: true,
      clerkUserId,
      userId: user.id,
    };
  }
}
