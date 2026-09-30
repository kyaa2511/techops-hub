import { DataSource, In } from 'typeorm';
import dataSource from '../src/database/typeorm-cli.config';
import { Membership } from '../src/memberships/membership.entity';
import { MembershipRole } from '../src/memberships/membership-role.enum';
import { Organization } from '../src/organizations/organization.entity';
import { OrganizationsService } from '../src/organizations/organizations.service';
import { User } from '../src/users/user.entity';

describe('Organization onboarding against PostgreSQL', () => {
  let database: DataSource;
  let organizationsService: OrganizationsService;
  const clerkUserIds = ['organization_onboarding_user'];
  const organizationSlugs = ['onboarding-tech', 'duplicate-onboarding-tech'];

  beforeAll(async () => {
    database = new DataSource({
      ...dataSource.options,
      name: 'organization-onboarding-e2e',
      entities: [User, Organization, Membership],
      migrations: [],
    });
    await database.initialize();
    organizationsService = new OrganizationsService(
      database.getRepository(Organization),
      database,
    );
  });

  beforeEach(async () => {
    await database.getRepository(Organization).delete({
      slug: In(organizationSlugs),
    });
    await database.getRepository(User).delete({
      clerkUserId: In(clerkUserIds),
    });
  });

  afterAll(async () => {
    await database.getRepository(Organization).delete({
      slug: In(organizationSlugs),
    });
    await database.getRepository(User).delete({
      clerkUserId: In(clerkUserIds),
    });
    await database.destroy();
  });

  it('creates an organization with an OWNER membership for the authenticated local user', async () => {
    const user = await database.getRepository(User).save({
      clerkUserId: clerkUserIds[0],
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    });

    const result = await organizationsService.createForClerkUser(
      clerkUserIds[0],
      {
        name: 'Onboarding Tech',
        slug: organizationSlugs[0],
      },
    );

    const persistedMembership = await database
      .getRepository(Membership)
      .findOne({
        where: {
          userId: user.id,
          organizationId: result.organization.id,
        },
      });

    expect(result.organization).toMatchObject({
      name: 'Onboarding Tech',
      slug: organizationSlugs[0],
    });
    expect(result.ownerMembership).toMatchObject({
      userId: user.id,
      organizationId: result.organization.id,
      role: MembershipRole.OWNER,
    });
    expect(persistedMembership).toMatchObject({
      userId: user.id,
      organizationId: result.organization.id,
      role: MembershipRole.OWNER,
    });
  });

  it('rejects duplicate organization slugs without creating another membership', async () => {
    const user = await database.getRepository(User).save({
      clerkUserId: clerkUserIds[0],
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'User',
    });
    await organizationsService.createForClerkUser(clerkUserIds[0], {
      name: 'Duplicate Onboarding Tech',
      slug: organizationSlugs[1],
    });

    await expect(
      organizationsService.createForClerkUser(clerkUserIds[0], {
        name: 'Duplicate Onboarding Tech Again',
        slug: organizationSlugs[1],
      }),
    ).rejects.toMatchObject({
      status: 409,
    });

    const memberships = await database.getRepository(Membership).find({
      where: { userId: user.id },
    });
    const organizations = await database.getRepository(Organization).find({
      where: { slug: organizationSlugs[1] },
    });

    expect(organizations).toHaveLength(1);
    expect(memberships).toHaveLength(1);
  });
});
