import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/authenticated-identity';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CreateOrganizationRequestDto } from './create-organization-request.dto';
import { OrganizationResponseDto } from './organization-response.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(ClerkAuthGuard)
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateOrganizationRequestDto,
  ): Promise<OrganizationResponseDto> {
    const clerkUserId = request.authenticatedIdentity?.clerkUserId;

    if (!clerkUserId) {
      throw new UnauthorizedException();
    }

    const result = await this.organizationsService.createForClerkUser(
      clerkUserId,
      body,
    );

    return OrganizationResponseDto.fromOrganizationAndMembership(
      result.organization,
      result.ownerMembership,
    );
  }
}
