import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { MembershipsService } from '../memberships/memberships.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { TenantRequest } from './tenant-context';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    @Inject(UsersService)
    private readonly usersService: Pick<UsersService, 'findByClerkUserId'>,
    @Inject(OrganizationsService)
    private readonly organizationsService: Pick<
      OrganizationsService,
      'findById'
    >,
    @Inject(MembershipsService)
    private readonly membershipsService: Pick<
      MembershipsService,
      'findByUserAndOrganization'
    >,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & TenantRequest>();
    const clerkUserId = request.authenticatedIdentity?.clerkUserId;

    if (!clerkUserId) {
      throw new UnauthorizedException();
    }

    const organizationId = request.headers['x-organization-id'];

    if (typeof organizationId !== 'string' || organizationId.length === 0) {
      throw new BadRequestException('X-Organization-Id header is required');
    }

    if (!isUUID(organizationId)) {
      throw new BadRequestException('X-Organization-Id must be a valid UUID');
    }

    const user = await this.usersService.findByClerkUserId(clerkUserId);
    const organization =
      await this.organizationsService.findById(organizationId);

    if (!organization) {
      throw new NotFoundException('Active organization was not found');
    }

    const membership = await this.membershipsService.findByUserAndOrganization(
      user.id,
      organization.id,
    );

    if (!membership) {
      throw new ForbiddenException(
        'Authenticated user is not a member of the active organization',
      );
    }

    request.authenticatedUser = user;
    request.tenantContext = { user, organization, membership };
    return true;
  }
}
