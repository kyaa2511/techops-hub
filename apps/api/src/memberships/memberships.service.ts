import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { Membership } from './membership.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @Inject('MembershipRepository')
    private readonly membershipsRepository: Repository<Membership>,
  ) {}

  findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<Membership | null> {
    return this.membershipsRepository.findOne({
      where: { userId, organizationId },
    });
  }
}
