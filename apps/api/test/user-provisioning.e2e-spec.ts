import { DataSource, In } from 'typeorm';
import dataSource from '../src/database/typeorm-cli.config';
import { Membership } from '../src/memberships/membership.entity';
import { Organization } from '../src/organizations/organization.entity';
import { User } from '../src/users/user.entity';
import { UsersService } from '../src/users/users.service';

describe('User provisioning against PostgreSQL', () => {
  let database: DataSource;
  let usersService: UsersService;
  const clerkUserIds = ['provisioning_e2e_user'];

  beforeAll(async () => {
    database = new DataSource({
      ...dataSource.options,
      name: 'provisioning-e2e',
      entities: [User, Organization, Membership],
      migrations: [],
    });
    await database.initialize();

    let profileRequests = 0;
    let releaseProfileRequests: () => void = () => undefined;
    const bothProfilesRequested = new Promise<void>((resolve) => {
      releaseProfileRequests = resolve;
    });
    const clerkClient = {
      users: {
        getUser: async () => {
          profileRequests += 1;
          if (profileRequests === 2) {
            releaseProfileRequests();
          }
          await bothProfilesRequested;
          return {
            emailAddresses: [{ emailAddress: 'provisioning@example.com' }],
            primaryEmailAddress: {
              emailAddress: 'provisioning@example.com',
            },
            firstName: 'Provisioned',
            lastName: 'User',
          };
        },
      },
    };

    usersService = new UsersService(database.getRepository(User), clerkClient);
  });

  beforeEach(async () => {
    await database.getRepository(User).delete({
      clerkUserId: In(clerkUserIds),
    });
  });

  afterAll(async () => {
    await database.getRepository(User).delete({
      clerkUserId: In(clerkUserIds),
    });
    await database.destroy();
  });

  it('creates only one local user for concurrent first requests', async () => {
    const results = await Promise.all([
      usersService.provisionByClerkUserId(clerkUserIds[0]),
      usersService.provisionByClerkUserId(clerkUserIds[0]),
    ]);

    const persistedUsers = await database.getRepository(User).find({
      where: { clerkUserId: clerkUserIds[0] },
    });

    expect(results.map((result) => result.user.id)).toEqual([
      persistedUsers[0].id,
      persistedUsers[0].id,
    ]);
    expect(persistedUsers).toHaveLength(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
  });
});
