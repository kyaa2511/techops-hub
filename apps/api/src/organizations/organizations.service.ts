import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { MembershipRole } from '../memberships/membership-role.enum';
import { Membership } from '../memberships/membership.entity';
import { User } from '../users/user.entity';
import { CreateOrganizationRequestDto } from './create-organization-request.dto';
import { Organization } from './organization.entity';

export interface OrganizationOnboardingResult {
  organization: Organization;
  ownerMembership: Membership;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationsRepository: Repository<Organization>,
    private readonly dataSource: DataSource,
  ) {}

  findById(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({
      where: { id },
    });
  }

  async listForClerkUser(clerkUserId: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { clerkUserId },
    });
    if (!user) {
      throw new NotFoundException('Authenticated user was not found');
    }
    const memberships = await this.dataSource.getRepository(Membership).find({
      where: { userId: user.id },
      relations: { organization: true },
      order: { organizationId: 'ASC' },
    });
    return memberships.map((membership) => ({
      organizationId: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      membershipId: membership.id,
      role: membership.role,
    }));
  }

  async createForClerkUser(
    clerkUserId: string,
    input: CreateOrganizationRequestDto,
  ): Promise<OrganizationOnboardingResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.getRepository(User).findOne({
          where: { clerkUserId },
        });

        if (!user) {
          throw new NotFoundException('Authenticated user was not found');
        }

        const organization = await manager.getRepository(Organization).save(
          manager.getRepository(Organization).create({
            name: input.name,
            slug: input.slug,
          }),
        );

        const ownerMembership = await manager.getRepository(Membership).save(
          manager.getRepository(Membership).create({
            userId: user.id,
            organizationId: organization.id,
            role: MembershipRole.OWNER,
          }),
        );

        return { organization, ownerMembership };
      });
    } catch (error) {
      if (this.isOrganizationSlugConflict(error)) {
        throw new ConflictException('Organization slug is already in use');
      }

      throw error;
    }
  }

  private isOrganizationSlugConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driverError.code === '23505' &&
      driverError.constraint === 'UQ_organizations_slug'
    );
  }
}
