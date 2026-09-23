import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  findById(id: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({
      where: { id },
    });
  }
}
