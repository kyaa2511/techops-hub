import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../auth/tenant-context';
import { MembershipRole } from '../memberships/membership-role.enum';
import { Customer } from './customer.entity';
import {
  CreateCustomerDto,
  ListCustomersDto,
  UpdateCustomerDto,
} from './customer-request.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repository: Repository<Customer>,
  ) {}

  // No public operation accepts a caller-selected tenant or exposes the repository.
  private organizationId(context: TenantContext): string {
    if (
      !context?.organization?.id ||
      context.membership?.organizationId !== context.organization.id ||
      context.membership?.userId !== context.user?.id ||
      ![MembershipRole.OWNER, MembershipRole.ADMIN].includes(
        context.membership.role,
      )
    ) {
      throw new ForbiddenException(
        'Customer management requires OWNER or ADMIN access',
      );
    }
    return context.organization.id;
  }

  async list(context: TenantContext, query: ListCustomersDto) {
    const organizationId = this.organizationId(context);
    const [items, total] = await this.repository.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items, total, page: query.page, limit: query.limit };
  }

  async get(context: TenantContext, id: string) {
    const customer = await this.repository.findOneBy({
      id,
      organizationId: this.organizationId(context),
    });
    if (!customer) throw new NotFoundException('Customer was not found');
    return customer;
  }

  async create(context: TenantContext, input: CreateCustomerDto) {
    const organizationId = this.organizationId(context);
    // Explicit allowlist prevents ownership/system fields entering persistence even outside HTTP.
    return this.repository.save(
      this.repository.create({
        organizationId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        status: input.status,
      }),
    );
  }

  async update(context: TenantContext, id: string, input: UpdateCustomerDto) {
    const organizationId = this.organizationId(context);
    const changes: UpdateCustomerDto = {};
    for (const key of [
      'name',
      'email',
      'phone',
      'address',
      'notes',
      'status',
    ] as const) {
      if (input[key] !== undefined)
        Object.assign(changes, { [key]: input[key] });
    }
    if (Object.keys(changes).length) {
      const result = await this.repository.update(
        { id, organizationId },
        changes,
      );
      if (!result.affected)
        throw new NotFoundException('Customer was not found');
    }
    return this.get(context, id);
  }
}
