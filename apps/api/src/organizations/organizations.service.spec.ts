import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { Membership } from '../memberships/membership.entity';
import { MembershipRole } from '../memberships/membership-role.enum';
import { User } from '../users/user.entity';
import { Organization } from './organization.entity';
import { OrganizationsService } from './organizations.service';

type TransactionCallback = (manager: EntityManager) => Promise<unknown>;

function createSlugConflictError(): QueryFailedError {
  const driverError = new Error('duplicate key') as Error & {
    code: string;
    constraint: string;
  };
  driverError.code = '23505';
  driverError.constraint = 'UQ_organizations_slug';

  return new QueryFailedError('INSERT', [], driverError);
}

describe('OrganizationsService', () => {
  it('creates an organization and OWNER membership in one transaction', async () => {
    const organization = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Katana Tech',
      slug: 'katana-tech',
    } as Organization;
    const membership = {
      id: '44444444-4444-4444-8444-444444444444',
      userId: '22222222-2222-4222-8222-222222222222',
      organizationId: organization.id,
      role: MembershipRole.OWNER,
    } as Membership;

    const userRepository = {
      findOne: jest.fn(
        async (_options: unknown) =>
          ({
            id: membership.userId,
            clerkUserId: 'user_123',
          }) as User,
      ),
    };
    const organizationRepository = {
      create: jest.fn((input: Partial<Organization>) => input as Organization),
      save: jest.fn(async (_input: Organization) => organization),
    };
    const membershipRepository = {
      create: jest.fn((input: Partial<Membership>) => input as Membership),
      save: jest.fn(async (_input: Membership) => membership),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) {
          return userRepository;
        }
        if (entity === Organization) {
          return organizationRepository;
        }
        return membershipRepository;
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (callback: TransactionCallback) =>
        callback(manager),
      ),
    };

    const service = new OrganizationsService(
      {} as Repository<Organization>,
      dataSource as never,
    );

    await expect(
      service.createForClerkUser('user_123', {
        name: 'Katana Tech',
        slug: 'katana-tech',
      }),
    ).resolves.toEqual({ organization, ownerMembership: membership });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { clerkUserId: 'user_123' },
    });
    expect(membershipRepository.create).toHaveBeenCalledWith({
      userId: membership.userId,
      organizationId: organization.id,
      role: MembershipRole.OWNER,
    });
  });

  it('rejects organization creation when the Clerk identity has no local user', async () => {
    const userRepository = {
      findOne: jest.fn(async (_options: unknown) => null),
    };
    const manager = {
      getRepository: jest.fn(() => userRepository),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (callback: TransactionCallback) =>
        callback(manager),
      ),
    };
    const service = new OrganizationsService(
      {} as Repository<Organization>,
      dataSource as never,
    );

    await expect(
      service.createForClerkUser('missing_user', {
        name: 'Katana Tech',
        slug: 'katana-tech',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a conflict for duplicate organization slugs', async () => {
    const dataSource = {
      transaction: jest.fn(async () => {
        throw createSlugConflictError();
      }),
    };
    const service = new OrganizationsService(
      {} as Repository<Organization>,
      dataSource as never,
    );

    await expect(
      service.createForClerkUser('user_123', {
        name: 'Katana Tech',
        slug: 'katana-tech',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not commit a partially-created organization when owner membership creation fails', async () => {
    const persistedOrganizations: Organization[] = [];
    const stagedOrganizations: Organization[] = [];
    const userRepository = {
      findOne: jest.fn(
        async (_options: unknown) =>
          ({
            id: '22222222-2222-4222-8222-222222222222',
            clerkUserId: 'user_123',
          }) as User,
      ),
    };
    const organizationRepository = {
      create: jest.fn(
        (input: Partial<Organization>) =>
          ({
            id: '33333333-3333-4333-8333-333333333333',
            ...input,
          }) as Organization,
      ),
      save: jest.fn(async (organization: Organization) => {
        stagedOrganizations.push(organization as Organization);
        return organization as Organization;
      }),
    };
    const membershipRepository = {
      create: jest.fn((input: Partial<Membership>) => input as Membership),
      save: jest.fn(async (_membership: Membership) => {
        throw new Error('membership insert failed');
      }),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) {
          return userRepository;
        }
        if (entity === Organization) {
          return organizationRepository;
        }
        return membershipRepository;
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (callback: TransactionCallback) => {
        const result = await callback(manager);
        persistedOrganizations.push(...stagedOrganizations);
        return result;
      }),
    };
    const service = new OrganizationsService(
      {} as Repository<Organization>,
      dataSource as never,
    );

    await expect(
      service.createForClerkUser('user_123', {
        name: 'Katana Tech',
        slug: 'katana-tech',
      }),
    ).rejects.toThrow('membership insert failed');

    expect(stagedOrganizations).toHaveLength(1);
    expect(persistedOrganizations).toHaveLength(0);
  });
});
