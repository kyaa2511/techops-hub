import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';
import type { User } from './user.entity';
import type { ClerkUserProfile } from './users.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  function createModule(repository: object, clerkClient: object) {
    return Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: repository,
        },
        {
          provide: 'ClerkUserProfileClient',
          useValue: clerkClient,
        },
      ],
    }).compile();
  }

  it('finds a local user by Clerk user ID', async () => {
    const user = { id: 'local-user-id', clerkUserId: 'user_123' } as User;
    const repository = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(user),
    };
    const clerkClient = { users: { getUser: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: repository,
        },
        {
          provide: 'ClerkUserProfileClient',
          useValue: clerkClient,
        },
      ],
    }).compile();

    await expect(
      moduleRef.get(UsersService).findByClerkUserId('user_123'),
    ).resolves.toBe(user);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { clerkUserId: 'user_123' },
    });
  });

  it('throws when no local user matches the Clerk user ID', async () => {
    const repository = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(null),
    };
    const clerkClient = { users: { getUser: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: repository,
        },
        {
          provide: 'ClerkUserProfileClient',
          useValue: clerkClient,
        },
      ],
    }).compile();

    await expect(
      moduleRef.get(UsersService).findByClerkUserId('missing_user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a local user from trusted Clerk profile data', async () => {
    const user = {
      id: 'local-user-id',
      clerkUserId: 'user_123',
      email: 'user@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    } as User;
    const repository = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(null),
      create: jest.fn<(input: Partial<User>) => User>().mockReturnValue(user),
      save: jest.fn<(input: User) => Promise<User>>().mockResolvedValue(user),
    };
    const clerkClient = {
      users: {
        getUser: jest.fn<() => Promise<ClerkUserProfile>>().mockResolvedValue({
          primaryEmailAddress: { emailAddress: user.email },
          emailAddresses: [{ emailAddress: user.email }],
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      },
    };
    const moduleRef = await createModule(repository, clerkClient);

    await expect(
      moduleRef.get(UsersService).provisionByClerkUserId(user.clerkUserId),
    ).resolves.toEqual({ user, created: true });
    expect(repository.create).toHaveBeenCalledWith({
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  });

  it('returns an existing local user without overwriting it', async () => {
    const user = {
      id: 'local-user-id',
      clerkUserId: 'user_123',
      email: 'existing@example.com',
    } as User;
    const repository = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(user),
      create: jest.fn<(input: Partial<User>) => User>(),
      save: jest.fn<(input: User) => Promise<User>>(),
    };
    const clerkClient = {
      users: { getUser: jest.fn() },
    };
    const moduleRef = await createModule(repository, clerkClient);

    await expect(
      moduleRef.get(UsersService).provisionByClerkUserId(user.clerkUserId),
    ).resolves.toEqual({ user, created: false });
    expect(clerkClient.users.getUser).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('recovers from a concurrent Clerk identity uniqueness conflict', async () => {
    const user = {
      id: 'local-user-id',
      clerkUserId: 'user_123',
      email: 'user@example.com',
    } as User;
    const repository = {
      findOne: jest
        .fn<() => Promise<User | null>>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(user),
      create: jest.fn<(input: Partial<User>) => User>().mockReturnValue(user),
      save: jest
        .fn<() => Promise<User>>()
        .mockResolvedValueOnce(user)
        .mockRejectedValueOnce(
          new QueryFailedError(
            'INSERT',
            [],
            Object.assign(new Error('duplicate'), {
              code: '23505',
              constraint: 'UQ_users_clerk_user_id',
            }),
          ),
        ),
    };
    const clerkClient = {
      users: {
        getUser: jest.fn<() => Promise<ClerkUserProfile>>().mockResolvedValue({
          emailAddresses: [{ emailAddress: user.email }],
          firstName: null,
          lastName: null,
        }),
      },
    };
    const moduleRef = await createModule(repository, clerkClient);
    const service = moduleRef.get(UsersService);

    const results = await Promise.all([
      service.provisionByClerkUserId(user.clerkUserId),
      service.provisionByClerkUserId(user.clerkUserId),
    ]);

    expect(results).toEqual([
      { user, created: true },
      { user, created: false },
    ]);
  });

  it('does not treat unrelated database errors as successful provisioning', async () => {
    const databaseError = new Error('database unavailable');
    const repository = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(null),
      create: jest.fn<(input: Partial<User>) => User>(),
      save: jest
        .fn<(input: User) => Promise<User>>()
        .mockRejectedValue(databaseError),
    };
    const clerkClient = {
      users: {
        getUser: jest.fn<() => Promise<ClerkUserProfile>>().mockResolvedValue({
          emailAddresses: [{ emailAddress: 'user@example.com' }],
        }),
      },
    };
    const moduleRef = await createModule(repository, clerkClient);

    await expect(
      moduleRef.get(UsersService).provisionByClerkUserId('user_123'),
    ).rejects.toBe(databaseError);
  });

  it('rejects Clerk profiles without a usable email address', async () => {
    const repository = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(null),
      create: jest.fn<(input: Partial<User>) => User>(),
      save: jest.fn<(input: User) => Promise<User>>(),
    };
    const clerkClient = {
      users: {
        getUser: jest.fn<() => Promise<ClerkUserProfile>>().mockResolvedValue({
          emailAddresses: [],
          primaryEmailAddress: null,
        }),
      },
    };
    const moduleRef = await createModule(repository, clerkClient);

    await expect(
      moduleRef.get(UsersService).provisionByClerkUserId('user_123'),
    ).rejects.toThrow('does not include an email address');
  });
});
