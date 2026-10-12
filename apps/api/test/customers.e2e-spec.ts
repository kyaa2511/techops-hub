import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import dataSource from '../src/database/typeorm-cli.config';
import { Customer, CustomerStatus } from '../src/customers/customer.entity';
import { CustomersService } from '../src/customers/customers.service';
import { Membership } from '../src/memberships/membership.entity';
import { MembershipRole } from '../src/memberships/membership-role.enum';
import { Organization } from '../src/organizations/organization.entity';
import { User } from '../src/users/user.entity';
import { TenantContext } from '../src/auth/tenant-context';

describe('Customers against PostgreSQL', () => {
  let database: DataSource;
  let service: CustomersService;
  let a: TenantContext;
  let b: TenantContext;
  const suffix = randomUUID();
  beforeAll(async () => {
    database = new DataSource({
      ...dataSource.options,
      entities: [User, Organization, Membership, Customer],
      migrations: [],
    });
    await database.initialize();
    service = new CustomersService(database.getRepository(Customer));
    const user = await database
      .getRepository(User)
      .save({
        clerkUserId: 'customers-' + suffix,
        email: 'customers@example.com',
      });
    const organizations = await database.getRepository(Organization).save([
      { name: 'Customers A', slug: 'customers-a-' + suffix },
      { name: 'Customers B', slug: 'customers-b-' + suffix },
    ]);
    const contexts = await Promise.all(
      organizations.map(async (organization) => ({
        user,
        organization,
        membership: await database.getRepository(Membership).save({
          userId: user.id,
          organizationId: organization.id,
          role: MembershipRole.OWNER,
        }),
      })),
    );
    [a, b] = contexts;
  });
  afterAll(async () => {
    if (a) await database.getRepository(Organization).delete(a.organization.id);
    if (b) await database.getRepository(Organization).delete(b.organization.id);
    if (a) await database.getRepository(User).delete(a.user.id);
    await database?.destroy();
  });
  it('persists all customer fields, defaults, tenant-safe reads and updates', async () => {
    const customer = await service.create(a, {
      name: 'Alice',
      email: 'alice@example.com',
      phone: '555-0100',
      address: 'Main Street',
      notes: 'Call first',
    });
    const other = await service.create(b, { name: 'Bob' });
    expect(customer).toMatchObject({
      organizationId: a.organization.id,
      status: CustomerStatus.ACTIVE,
      notes: 'Call first',
    });
    expect(customer.createdAt).toBeInstanceOf(Date);
    expect(
      (await service.list(a, { page: 1, limit: 25 })).items.map(
        (row) => row.id,
      ),
    ).toEqual([customer.id]);
    await expect(service.get(a, other.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.update(a, other.id, { name: 'Stolen' }),
    ).rejects.toMatchObject({ status: 404 });
    expect((await service.get(b, other.id)).name).toBe('Bob');
    const updated = await service.update(a, customer.id, {
      notes: null,
      status: CustomerStatus.INACTIVE,
    });
    expect(updated).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      notes: null,
      status: CustomerStatus.INACTIVE,
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      customer.updatedAt.getTime(),
    );
    // Last page and invalid FK exercise actual persistence rather than mocks.
    expect((await service.list(a, { page: 2, limit: 1 })).items).toEqual([]);
    await expect(
      database
        .getRepository(Customer)
        .save({ organizationId: randomUUID(), name: 'Orphan' }),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
  });
  it('rejects MEMBER and mismatched contexts before data access', async () => {
    const member = {
      ...a,
      membership: { ...a.membership, role: MembershipRole.MEMBER },
    };
    await expect(
      service.list(member, { page: 1, limit: 25 }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.create(
        { ...a, organization: b.organization },
        { name: 'Wrong scope' },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
