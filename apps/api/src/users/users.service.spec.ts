import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('finds a local user by Clerk user ID', async () => {
    const user = { id: 'local-user-id', clerkUserId: 'user_123' } as User;
    const repository = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(user),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: repository,
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
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UserRepository',
          useValue: repository,
        },
      ],
    }).compile();

    await expect(
      moduleRef.get(UsersService).findByClerkUserId('missing_user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
