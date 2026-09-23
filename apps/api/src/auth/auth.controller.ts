import {
  Controller,
  Get,
  Inject,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserProvisioningResponseDto } from '../users/user-provisioning-response.dto';
import { AuthenticatedRequest } from './authenticated-identity';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantRequest } from './tenant-context';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: Pick<
      UsersService,
      'findByClerkUserId' | 'provisionByClerkUserId'
    >,
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

  @Post('provision')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkAuthGuard)
  async provision(@Req() request: AuthenticatedRequest) {
    const clerkUserId = request.authenticatedIdentity?.clerkUserId;

    if (!clerkUserId) {
      throw new UnauthorizedException();
    }

    const { user, created } =
      await this.usersService.provisionByClerkUserId(clerkUserId);

    return new UserProvisioningResponseDto(user.id, user.clerkUserId, created);
  }

  @Get('context')
  @UseGuards(ClerkAuthGuard, TenantContextGuard)
  getContext(@Req() request: TenantRequest) {
    const context = request.tenantContext;

    if (!context) {
      throw new UnauthorizedException();
    }

    return {
      authenticated: true,
      userId: context.user.id,
      organizationId: context.organization.id,
      membershipId: context.membership.id,
      role: context.membership.role,
    };
  }
}
