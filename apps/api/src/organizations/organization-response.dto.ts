import type { Membership } from '../memberships/membership.entity';
import type { Organization } from './organization.entity';

export class OrganizationResponseDto {
  constructor(
    public readonly organizationId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly ownerMembershipId: string,
  ) {}

  static fromOrganizationAndMembership(
    organization: Organization,
    membership: Membership,
  ): OrganizationResponseDto {
    return new OrganizationResponseDto(
      organization.id,
      organization.name,
      organization.slug,
      membership.id,
    );
  }
}
