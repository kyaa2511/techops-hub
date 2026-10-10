import {
  DataSource,
  In,
  EntitySubscriberInterface,
  InsertEvent,
} from 'typeorm';
import dataSource from '../src/database/typeorm-cli.config';
import { Membership } from '../src/memberships/membership.entity';
import { MembershipRole } from '../src/memberships/membership-role.enum';
import { Organization } from '../src/organizations/organization.entity';
import { OrganizationsService } from '../src/organizations/organizations.service';
import { User } from '../src/users/user.entity';

describe('Organization onboarding against PostgreSQL', () => {
  let database: DataSource;
  let organizationsService: OrganizationsService;
  const clerkUserIds = [
    'organization_onboarding_user',
    'organization_other_user',
  ];
  const organizationSlugs = [
    'onboarding-tech',
    'duplicate-onboarding-tech',
    'rollback-onboarding-tech',
  ];

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
  it('rolls back the persisted organization when OWNER membership insertion fails', async () => {
    const user = await database.getRepository(User).save({
      clerkUserId: clerkUserIds[0],
      email: 'rollback-owner@example.com',
    });
    let organizationWasInserted = false;
    const failureSubscriber: EntitySubscriberInterface<Membership> = {
      listenTo: () => Membership,
      async beforeInsert(event: InsertEvent<Membership>) {
        if (event.entity?.userId !== user.id) return;
        organizationWasInserted = await event.manager
          .getRepository(Organization)
          .existsBy({
            id: event.entity.organizationId,
            slug: organizationSlugs[2],
          });
        // Fail inside the real PostgreSQL transaction after the organization INSERT.
        await event.manager.query('SELECT 1 / 0');
      },
    };
    database.subscribers.push(failureSubscriber);
    try {
      await expect(
        organizationsService.createForClerkUser(clerkUserIds[0], {
          name: 'Rollback Onboarding Tech',
          slug: organizationSlugs[2],
        }),
      ).rejects.toMatchObject({ driverError: { code: '22012' } });
    } finally {
      database.subscribers.splice(
        database.subscribers.indexOf(failureSubscriber),
        1,
      );
    }
    expect(organizationWasInserted).toBe(true);
    expect(
      await database
        .getRepository(Organization)
        .countBy({ slug: organizationSlugs[2] }),
    ).toBe(0);
    expect(
      await database.getRepository(Membership).countBy({ userId: user.id }),
    ).toBe(0);
  });
  it('lists memberships across organizations while excluding another users tenant', async () => {
    await database.getRepository(User).save([
      { clerkUserId: clerkUserIds[0], email: 'selector@example.com' },
      { clerkUserId: clerkUserIds[1], email: 'other@example.com' },
    ]);
    expect(
      await organizationsService.listForClerkUser(clerkUserIds[0]),
    ).toEqual([]);
    const first = await organizationsService.createForClerkUser(
      clerkUserIds[0],
      {
        name: 'First',
        slug: organizationSlugs[0],
      },
    );
    const second = await organizationsService.createForClerkUser(
      clerkUserIds[0],
      {
        name: 'Second',
        slug: organizationSlugs[1],
      },
    );
    await organizationsService.createForClerkUser(clerkUserIds[1], {
      name: 'Other',
      slug: organizationSlugs[2],
    });
    const listed = await organizationsService.listForClerkUser(clerkUserIds[0]);
    expect(listed).toHaveLength(2);
    expect(listed).toEqual(
      expect.arrayContaining(
        [first, second].map((result) => ({
          organizationId: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          membershipId: result.ownerMembership.id,
          role: MembershipRole.OWNER,
        })),
      ),
    );
    await expect(
      organizationsService.listForClerkUser('unprovisioned_identity'),
    ).rejects.toMatchObject({ status: 404 });
  });
});
